
const pool = require('../config/db');
const audit = require('./auditService');

const {
    calculateOrderTotals
} = require('../utils/iterativoOrderTotals');

// ============================================================
// HELPERS
// ============================================================

function serviceError(status, message) {
    const error = new Error(message);
    error.status = status;
    error.publicMessage = message;
    return error;
}

// Audit logging must not delay an operation that has already
// been committed successfully.
function logAuditSafely(entry) {
    Promise.resolve()
        .then(() => audit.log(entry))
        .catch((error) => {
            console.error(
                '[BARLOUNGE] Audit logging failed:',
                error
            );
        });
}

function validateId(value, message) {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw serviceError(400, message);
    }

    return id;
}

function validateQuantity(value) {
    const quantity = Number(value);

    if (!Number.isInteger(quantity) || quantity <= 0) {
        throw serviceError(
            400,
            'Quantity must be a positive whole number.'
        );
    }

    return quantity;
}

async function getOpenOrderForUpdate(
    connection,
    orderId,
    siteId
) {
    const [rows] = await connection.query(
        `
        SELECT
            order_id,
            table_id,
            site_id,
            waiter_id,
            status
        FROM bar_orders
        WHERE order_id = ?
          AND site_id = ?
        LIMIT 1
        FOR UPDATE
        `,
        [orderId, siteId]
    );

    if (!rows.length) {
        throw serviceError(
            404,
            'Order not found for this site.'
        );
    }

    if (rows[0].status !== 'OPEN') {
        throw serviceError(
            409,
            'This order can no longer be modified.'
        );
    }

    return rows[0];
}

async function getReservedQuantity(
    connection,
    siteId,
    productId,
    excludedOrderId
) {
    const [[row]] = await connection.query(
        `
        SELECT COALESCE(SUM(oi.quantity), 0)
            AS reserved_quantity
        FROM bar_order_items oi
        INNER JOIN bar_orders bo
            ON bo.order_id = oi.order_id
        WHERE bo.site_id = ?
          AND bo.status = 'OPEN'
          AND bo.order_id <> ?
          AND oi.product_id = ?
        `,
        [siteId, excludedOrderId, productId]
    );

    return Number(row.reserved_quantity || 0);
}

async function getStockForUpdate(
    connection,
    siteId,
    productId
) {
    const [rows] = await connection.query(
        `
        SELECT inventory_id, quantity
        FROM inventory
        WHERE site_id = ?
          AND product_id = ?
        LIMIT 1
        FOR UPDATE
        `,
        [siteId, productId]
    );

    if (!rows.length) {
        throw serviceError(
            404,
            'Product inventory was not found for this site.'
        );
    }

    return Number(rows[0].quantity);
}

// ============================================================
// 1. LIST OPEN ORDERS
// GET /api/orders?siteId=1
// ============================================================

async function list(siteId) {
    siteId = validateId(
        siteId,
        'Select a valid site.'
    );

    const [orders] = await pool.query(
        `
        SELECT
            bo.order_id,
            bo.table_id,
            bo.site_id,
            bo.waiter_id,
            bo.status,
            bo.opened_at,
            bo.updated_at,
            dt.table_number,
            s.name AS site,
            u.name AS waiter_name
        FROM bar_orders bo
        INNER JOIN dining_tables dt
            ON dt.table_id = bo.table_id
        INNER JOIN sites s
            ON s.site_id = bo.site_id
        INNER JOIN users u
            ON u.user_id = bo.waiter_id
        WHERE bo.site_id = ?
          AND bo.status = 'OPEN'
        ORDER BY bo.opened_at DESC
        `,
        [siteId]
    );

    if (!orders.length) {
        return [];
    }

    const orderIds = orders.map(
        (order) => order.order_id
    );

    const [items] = await pool.query(
        `
        SELECT order_id, quantity, unit_price
        FROM bar_order_items
        WHERE order_id IN (?)
        ORDER BY order_id
        `,
        [orderIds]
    );

    const itemsByOrder = {};

    for (const item of items) {
        if (!itemsByOrder[item.order_id]) {
            itemsByOrder[item.order_id] = [];
        }

        itemsByOrder[item.order_id].push(item);
    }

    return orders.map((order) => {
        const orderItems =
            itemsByOrder[order.order_id] || [];

        const calculation =
            calculateOrderTotals(orderItems);

        return {
            ...order,
            total: calculation.total,
            total_quantity: calculation.totalQuantity,
            product_lines: orderItems.length
        };
    });
}

// ============================================================
// 2. CREATE ORDER FOR A FREE TABLE
// POST /api/orders
// ============================================================

async function create(tableId, siteId, waiterId) {
    tableId = validateId(
        tableId,
        'Select a valid table.'
    );

    siteId = validateId(
        siteId,
        'Select a valid site.'
    );

    waiterId = validateId(
        waiterId,
        'The current user is invalid.'
    );

    const connection = await pool.getConnection();
    let orderId;

    try {
        await connection.beginTransaction();

        const [tables] = await connection.query(
            `
            SELECT
                dt.table_id,
                dt.site_id,
                dt.status
            FROM dining_tables dt
            INNER JOIN sites s
                ON s.site_id = dt.site_id
            WHERE dt.table_id = ?
              AND dt.site_id = ?
              AND s.status = 'ACTIVE'
            LIMIT 1
            FOR UPDATE
            `,
            [tableId, siteId]
        );

        if (!tables.length) {
            throw serviceError(
                404,
                'The selected table was not found for this site.'
            );
        }

        const [existingOrders] =
            await connection.query(
                `
                SELECT order_id
                FROM bar_orders
                WHERE table_id = ?
                  AND status = 'OPEN'
                LIMIT 1
                FOR UPDATE
                `,
                [tableId]
            );

        if (existingOrders.length) {
            throw serviceError(
                409,
                'This table already has an open order.'
            );
        }

        if (tables[0].status !== 'FREE') {
            throw serviceError(
                409,
                'This table is not available.'
            );
        }

        const [result] = await connection.query(
            `
            INSERT INTO bar_orders
                (table_id, site_id, waiter_id, status)
            VALUES (?, ?, ?, 'OPEN')
            `,
            [tableId, siteId, waiterId]
        );

        orderId = result.insertId;

        await connection.query(
            `
            UPDATE dining_tables
            SET status = 'OCCUPIED'
            WHERE table_id = ?
              AND site_id = ?
            `,
            [tableId, siteId]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    logAuditSafely({
        userId: waiterId,
        action: 'CREATE',
        entity: 'bar_orders',
        entityId: orderId,
        result: 'SUCCESS'
    });

    return {
        order_id: orderId,
        status: 'OPEN'
    };
}

// ============================================================
// 3. GET ORDER DETAILS
// GET /api/orders/:id
// ============================================================

async function getById(orderId, siteId) {
    orderId = validateId(
        orderId,
        'Invalid order.'
    );

    siteId = validateId(
        siteId,
        'Select a valid site.'
    );

    const [orders] = await pool.query(
        `
        SELECT
            bo.order_id,
            bo.table_id,
            bo.site_id,
            bo.waiter_id,
            bo.status,
            bo.opened_at,
            bo.updated_at,
            dt.table_number,
            s.name AS site,
            u.name AS waiter_name
        FROM bar_orders bo
        INNER JOIN dining_tables dt
            ON dt.table_id = bo.table_id
        INNER JOIN sites s
            ON s.site_id = bo.site_id
        INNER JOIN users u
            ON u.user_id = bo.waiter_id
        WHERE bo.order_id = ?
          AND bo.site_id = ?
        LIMIT 1
        `,
        [orderId, siteId]
    );

    if (!orders.length) {
        throw serviceError(
            404,
            'Order not found for this site.'
        );
    }

    const order = orders[0];

    const [items] = await pool.query(
        `
        SELECT
            oi.order_item_id,
            oi.order_id,
            oi.product_id,
            oi.quantity,
            oi.unit_price,
            p.code,
            p.name AS product_name,
            p.sale_unit
        FROM bar_order_items oi
        INNER JOIN products p
            ON p.product_id = oi.product_id
        WHERE oi.order_id = ?
        ORDER BY p.name ASC
        `,
        [orderId]
    );

    const calculation = calculateOrderTotals(items);

    return {
        ...order,
        items: calculation.items,
        total: calculation.total,
        total_quantity: calculation.totalQuantity,
        product_lines: calculation.items.length
    };
}

// ============================================================
// 4. PRODUCT AVAILABILITY BY SITE
// GET /api/orders/availability
// ============================================================


async function availability(siteId, orderId = null) {
    siteId = validateId(
        siteId,
        'Select a valid site.'
    );

    if (orderId !== null && orderId !== undefined) {
        orderId = validateId(orderId, 'Invalid order.');

        const order = await getById(orderId, siteId);

        if (order.status !== 'OPEN') {
            throw serviceError(
                409,
                'This order is no longer open.'
            );
        }
    } else {
        orderId = null;
    }

    const [rows] = await pool.query(
        `
        SELECT
            p.product_id,
            p.code,
            p.name,
            p.sale_unit,
            p.sale_price,
            i.quantity AS stock_quantity,

            COALESCE(
                reserved.reserved_quantity,
                0
            ) AS other_reserved_quantity,

            COALESCE(
                current_item.quantity,
                0
            ) AS current_order_quantity,

            GREATEST(
                i.quantity
                - COALESCE(reserved.reserved_quantity, 0)
                - COALESCE(current_item.quantity, 0),
                0
            ) AS available_to_add

        FROM products p

        /* Solo productos asignados al inventario de esta sede */
        INNER JOIN inventory i
            ON i.product_id = p.product_id
            AND i.site_id = ?

        /* Cantidades comprometidas en otros pedidos abiertos */
        LEFT JOIN (
            SELECT
                oi.product_id,
                SUM(oi.quantity) AS reserved_quantity
            FROM bar_order_items oi
            INNER JOIN bar_orders bo
                ON bo.order_id = oi.order_id
            WHERE bo.site_id = ?
                AND bo.status = 'OPEN'
                AND (? IS NULL OR bo.order_id <> ?)
            GROUP BY oi.product_id
        ) reserved
            ON reserved.product_id = p.product_id

        /* Cantidad que ya está en el pedido actual */
        LEFT JOIN bar_order_items current_item
            ON current_item.product_id = p.product_id
            AND current_item.order_id = ?

        WHERE p.status = 'ACTIVE'
        
        ORDER BY p.name ASC
        `,
        [
            siteId,
            siteId,
            orderId,
            orderId,
            orderId
        ]
    );

    return rows.map((product) => ({
        ...product,
        stock_quantity: Number(product.stock_quantity),
        other_reserved_quantity: Number(
            product.other_reserved_quantity
        ),
        current_order_quantity: Number(
            product.current_order_quantity
        ),
        available_to_add: Number(product.available_to_add),
        sale_price: Number(product.sale_price)
    }));
}

// ============================================================
// 5. ADD PRODUCT TO ORDER
// POST /api/orders/:id/items
// ============================================================

async function addItem(
    orderId,
    siteId,
    productId,
    amount,
    actorId
) {
    orderId = validateId(orderId, 'Invalid order.');
    siteId = validateId(siteId, 'Select a valid site.');
    productId = validateId(
        productId,
        'Select a valid product.'
    );
    amount = validateQuantity(amount);

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        await getOpenOrderForUpdate(
            connection,
            orderId,
            siteId
        );

        const [products] = await connection.query(
            `
            SELECT product_id, sale_price, status
            FROM products
            WHERE product_id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [productId]
        );

        if (
            !products.length ||
            products[0].status !== 'ACTIVE'
        ) {
            throw serviceError(
                404,
                'The selected product is not available.'
            );
        }

        const stock = await getStockForUpdate(
            connection,
            siteId,
            productId
        );

        const [existingItems] =
            await connection.query(
                `
                SELECT order_item_id, quantity
                FROM bar_order_items
                WHERE order_id = ?
                  AND product_id = ?
                LIMIT 1
                FOR UPDATE
                `,
                [orderId, productId]
            );

        const existingQuantity = existingItems.length
            ? Number(existingItems[0].quantity)
            : 0;

        const otherReserved = await getReservedQuantity(
            connection,
            siteId,
            productId,
            orderId
        );

        if (
            otherReserved + existingQuantity + amount >
            stock
        ) {
            throw serviceError(
                409,
                'The requested quantity exceeds the available stock for this site.'
            );
        }

        if (existingItems.length) {
            await connection.query(
                `
                UPDATE bar_order_items
                SET quantity = quantity + ?
                WHERE order_item_id = ?
                  AND order_id = ?
                `,
                [
                    amount,
                    existingItems[0].order_item_id,
                    orderId
                ]
            );
        } else {
            await connection.query(
                `
                INSERT INTO bar_order_items
                    (order_id, product_id, quantity, unit_price)
                VALUES (?, ?, ?, ?)
                `,
                [
                    orderId,
                    productId,
                    amount,
                    products[0].sale_price
                ]
            );
        }

        await connection.query(
            `
            UPDATE bar_orders
            SET updated_at = CURRENT_TIMESTAMP
            WHERE order_id = ?
            `,
            [orderId]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    logAuditSafely({
        userId: actorId,
        action: 'ADD_ITEM',
        entity: 'bar_orders',
        entityId: orderId,
        result: 'SUCCESS'
    });

    return {
        order_id: orderId,
        status: 'OPEN'
    };
}

// ============================================================
// 6. UPDATE PRODUCT QUANTITY
// PUT /api/orders/:id/items/:itemId
// ============================================================

async function updateItem(
    orderId,
    itemId,
    siteId,
    amount,
    actorId
) {
    orderId = validateId(orderId, 'Invalid order.');
    itemId = validateId(itemId, 'Invalid order item.');
    siteId = validateId(siteId, 'Select a valid site.');
    amount = validateQuantity(amount);

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        await getOpenOrderForUpdate(
            connection,
            orderId,
            siteId
        );

        const [items] = await connection.query(
            `
            SELECT order_item_id, product_id, quantity
            FROM bar_order_items
            WHERE order_item_id = ?
              AND order_id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [itemId, orderId]
        );

        if (!items.length) {
            throw serviceError(404, 'Order item not found.');
        }

        const productId = items[0].product_id;

        const stock = await getStockForUpdate(
            connection,
            siteId,
            productId
        );

        const otherReserved = await getReservedQuantity(
            connection,
            siteId,
            productId,
            orderId
        );

        if (otherReserved + amount > stock) {
            throw serviceError(
                409,
                'The requested quantity exceeds the available stock for this site.'
            );
        }

        await connection.query(
            `
            UPDATE bar_order_items
            SET quantity = ?
            WHERE order_item_id = ?
              AND order_id = ?
            `,
            [amount, itemId, orderId]
        );

        await connection.query(
            `
            UPDATE bar_orders
            SET updated_at = CURRENT_TIMESTAMP
            WHERE order_id = ?
            `,
            [orderId]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    logAuditSafely({
        userId: actorId,
        action: 'UPDATE_ITEM',
        entity: 'bar_orders',
        entityId: orderId,
        result: 'SUCCESS'
    });

    return {
        order_id: orderId,
        status: 'OPEN'
    };
}

// ============================================================
// 7. REMOVE PRODUCT FROM OPEN ORDER
// DELETE /api/orders/:id/items/:itemId
// ============================================================

async function removeItem(
    orderId,
    itemId,
    siteId,
    actorId
) {
    orderId = validateId(orderId, 'Invalid order.');
    itemId = validateId(itemId, 'Invalid order item.');
    siteId = validateId(siteId, 'Select a valid site.');

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        await getOpenOrderForUpdate(
            connection,
            orderId,
            siteId
        );

        const [items] = await connection.query(
            `
            SELECT order_item_id
            FROM bar_order_items
            WHERE order_item_id = ?
              AND order_id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [itemId, orderId]
        );

        if (!items.length) {
            throw serviceError(404, 'Order item not found.');
        }

        await connection.query(
            `
            DELETE FROM bar_order_items
            WHERE order_item_id = ?
              AND order_id = ?
            `,
            [itemId, orderId]
        );

        await connection.query(
            `
            UPDATE bar_orders
            SET updated_at = CURRENT_TIMESTAMP
            WHERE order_id = ?
            `,
            [orderId]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    logAuditSafely({
        userId: actorId,
        action: 'REMOVE_ITEM',
        entity: 'bar_orders',
        entityId: orderId,
        result: 'SUCCESS'
    });

    return {
        order_id: orderId,
        status: 'OPEN'
    };
}

// ============================================================
// 8. SAVE ORDER WITHOUT CLOSING IT
// POST /api/orders/:id/save
// ============================================================

async function save(orderId, siteId, actorId) {
    orderId = validateId(orderId, 'Invalid order.');
    siteId = validateId(siteId, 'Select a valid site.');

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        await getOpenOrderForUpdate(
            connection,
            orderId,
            siteId
        );

        const [[result]] = await connection.query(
            `
            SELECT COUNT(*) AS item_count
            FROM bar_order_items
            WHERE order_id = ?
            `,
            [orderId]
        );

        if (Number(result.item_count) === 0) {
            throw serviceError(
                400,
                'Add at least one product before saving the order.'
            );
        }

        await connection.query(
            `
            UPDATE bar_orders
            SET updated_at = CURRENT_TIMESTAMP
            WHERE order_id = ?
              AND site_id = ?
              AND status = 'OPEN'
            `,
            [orderId, siteId]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    logAuditSafely({
        userId: actorId,
        action: 'SAVE_ORDER',
        entity: 'bar_orders',
        entityId: orderId,
        result: 'SUCCESS'
    });

    return {
        order_id: orderId,
        status: 'OPEN'
    };
}

// ============================================================
// 9. CANCEL EMPTY ORDER AND RELEASE TABLE
// POST /api/orders/:id/cancel
// ============================================================

async function cancel(orderId, siteId, actorId) {
    orderId = validateId(orderId, 'Invalid order.');
    siteId = validateId(siteId, 'Select a valid site.');

    const connection = await pool.getConnection();
    let tableId;

    try {
        await connection.beginTransaction();

        const [[reference]] = await connection.query(
            `
            SELECT table_id
            FROM bar_orders
            WHERE order_id = ?
              AND site_id = ?
              AND status = 'OPEN'
            LIMIT 1
            `,
            [orderId, siteId]
        );

        if (!reference) {
            throw serviceError(
                404,
                'Open order not found.'
            );
        }

        tableId = reference.table_id;

        const [tables] = await connection.query(
            `
            SELECT table_id
            FROM dining_tables
            WHERE table_id = ?
              AND site_id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [tableId, siteId]
        );

        if (!tables.length) {
            throw serviceError(404, 'Table not found.');
        }

        const [orders] = await connection.query(
            `
            SELECT order_id
            FROM bar_orders
            WHERE order_id = ?
              AND site_id = ?
              AND status = 'OPEN'
            LIMIT 1
            FOR UPDATE
            `,
            [orderId, siteId]
        );

        if (!orders.length) {
            throw serviceError(
                409,
                'The order is no longer open.'
            );
        }

        const [[result]] = await connection.query(
            `
            SELECT COUNT(*) AS item_count
            FROM bar_order_items
            WHERE order_id = ?
            `,
            [orderId]
        );

        if (Number(result.item_count) > 0) {
            throw serviceError(
                409,
                'Remove all products before cancelling the order.'
            );
        }

        await connection.query(
            `
            UPDATE bar_orders
            SET status = 'CANCELLED',
                closed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE order_id = ?
              AND site_id = ?
              AND status = 'OPEN'
            `,
            [orderId, siteId]
        );

        await connection.query(
            `
            UPDATE dining_tables
            SET status = 'FREE'
            WHERE table_id = ?
              AND site_id = ?
              AND status = 'OCCUPIED'
            `,
            [tableId, siteId]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    logAuditSafely({
        userId: actorId,
        action: 'CANCEL_ORDER',
        entity: 'bar_orders',
        entityId: orderId,
        result: 'SUCCESS'
    });

    return {
        order_id: orderId,
        table_id: tableId,
        status: 'CANCELLED'
    };
}

// ============================================================
// EXPORT SERVICE
// ============================================================

module.exports = {
    list,
    create,
    getById,
    availability,
    addItem,
    updateItem,
    removeItem,
    save,
    cancel
};
