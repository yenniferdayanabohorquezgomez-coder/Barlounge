const pool = require('../config/db');
const audit = require('./auditService');

// ============================================================
// HELPERS
// ============================================================

function serviceError(status, message) {
    const error = new Error(message);
    error.status = status;
    error.publicMessage = message;
    return error;
}

function validateId(value, message) {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw serviceError(400, message);
    }

    return id;
}

function logAuditSafely(entry) {
    Promise.resolve()
        .then(() => audit.log(entry))
        .catch((error) => {
            console.error(
                '[BARLOUNGE] Inventory audit error:',
                error
            );
        });
}

// ============================================================
// INVENTORY: LIST ASSIGNED PRODUCTS
// ============================================================

async function list(siteId) {
    siteId = validateId(
        siteId,
        'A valid site is required.'
    );

    const [rows] = await pool.query(
        `
        SELECT
            i.inventory_id,
            i.site_id,
            st.name AS site,
            i.product_id,
            p.code,
            p.name AS product,
            p.purchase_unit,
            p.sale_unit,
            p.purchase_price,
            p.sale_price,
            p.status AS product_status,
            i.quantity,
            i.updated_at
        FROM inventory i
        INNER JOIN sites st
            ON st.site_id = i.site_id
        INNER JOIN products p
            ON p.product_id = i.product_id
        WHERE i.site_id = ?
        ORDER BY p.name ASC
        `,
        [siteId]
    );

    return rows;
}

// ============================================================
// PRODUCT ASSIGNMENT: LIST CURRENT ASSIGNMENTS
// ============================================================

async function listAssignments(siteId) {
    return list(siteId);
}

// ============================================================
// PRODUCT ASSIGNMENT: LIST PRODUCTS NOT ASSIGNED TO A SITE
// ============================================================

async function listAssignableProducts(siteId) {
    siteId = validateId(
        siteId,
        'A valid site is required.'
    );

    const [sites] = await pool.query(
        `
        SELECT site_id
        FROM sites
        WHERE site_id = ?
            AND status = 'ACTIVE'
        LIMIT 1
        `,
        [siteId]
    );

    if (!sites.length) {
        throw serviceError(
            404,
            'The selected site does not exist or is inactive.'
        );
    }

    const [products] = await pool.query(
        `
        SELECT
            p.product_id,
            p.code,
            p.name,
            p.purchase_unit,
            p.sale_unit,
            p.purchase_price,
            p.sale_price,
            p.status,
            pt.name AS product_type,
            s.name AS supplier
        FROM products p
        INNER JOIN product_types pt
            ON pt.product_type_id = p.product_type_id
        INNER JOIN suppliers s
            ON s.supplier_id = p.supplier_id
        WHERE p.status = 'ACTIVE'
            AND NOT EXISTS (
                SELECT 1
                FROM inventory i
                WHERE i.site_id = ?
                    AND i.product_id = p.product_id
            )
        ORDER BY p.name ASC
        `,
        [siteId]
    );

    return products;
}

// ============================================================
// PRODUCT ASSIGNMENT: ASSIGN A PRODUCT TO A SITE
// A new assignment starts with quantity zero.
// ============================================================

async function assignProduct(
    siteId,
    productId,
    actorId
) {
    siteId = validateId(
        siteId,
        'A valid site is required.'
    );

    productId = validateId(
        productId,
        'A valid product is required.'
    );

    const connection = await pool.getConnection();

    let inventoryId;

    try {
        await connection.beginTransaction();

        const [sites] = await connection.query(
            `
            SELECT site_id
            FROM sites
            WHERE site_id = ?
                AND status = 'ACTIVE'
            LIMIT 1
            FOR UPDATE
            `,
            [siteId]
        );

        if (!sites.length) {
            throw serviceError(
                404,
                'The selected site does not exist or is inactive.'
            );
        }

        const [products] = await connection.query(
            `
            SELECT product_id
            FROM products
            WHERE product_id = ?
                AND status = 'ACTIVE'
            LIMIT 1
            FOR UPDATE
            `,
            [productId]
        );

        if (!products.length) {
            throw serviceError(
                404,
                'The product does not exist or is inactive.'
            );
        }

        const [existing] = await connection.query(
            `
            SELECT inventory_id
            FROM inventory
            WHERE site_id = ?
                AND product_id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [siteId, productId]
        );

        if (existing.length) {
            throw serviceError(
                409,
                'This product is already assigned to the selected site.'
            );
        }

        const [result] = await connection.query(
            `
            INSERT INTO inventory (
                site_id,
                product_id,
                quantity
            )
            VALUES (?, ?, 0)
            `,
            [siteId, productId]
        );

        inventoryId = result.insertId;

        await connection.commit();
    } catch (error) {
        await connection.rollback();

        if (error.code === 'ER_DUP_ENTRY') {
            throw serviceError(
                409,
                'This product is already assigned to the selected site.'
            );
        }

        throw error;
    } finally {
        connection.release();
    }

    logAuditSafely({
        userId: actorId,
        action: 'ASSIGN',
        entity: 'inventory',
        entityId: inventoryId,
        result: 'SUCCESS'
    });

    const [[assignment]] = await pool.query(
        `
        SELECT
            i.inventory_id,
            i.site_id,
            i.product_id,
            i.quantity,
            p.code,
            p.name AS product,
            p.purchase_unit,
            p.sale_unit,
            p.purchase_price,
            p.sale_price
        FROM inventory i
        INNER JOIN products p
            ON p.product_id = i.product_id
        WHERE i.inventory_id = ?
        LIMIT 1
        `,
        [inventoryId]
    );

    return assignment;
}

// ============================================================
// PRODUCT ASSIGNMENT: REMOVE A PRODUCT FROM A SITE
// Only zero-stock assignments without open-order usage
// can be removed.
// ============================================================

async function unassignProduct(
    inventoryId,
    siteId,
    actorId
) {
    inventoryId = validateId(
        inventoryId,
        'A valid assignment is required.'
    );

    siteId = validateId(
        siteId,
        'A valid site is required.'
    );

    const connection = await pool.getConnection();

    let productId;

    try {
        await connection.beginTransaction();

        const [assignments] = await connection.query(
            `
            SELECT
                inventory_id,
                product_id,
                quantity
            FROM inventory
            WHERE inventory_id = ?
                AND site_id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [inventoryId, siteId]
        );

        if (!assignments.length) {
            throw serviceError(
                404,
                'The product assignment was not found for this site.'
            );
        }

        const assignment = assignments[0];

        productId = assignment.product_id;

        if (Number(assignment.quantity) > 0) {
            throw serviceError(
                409,
                'This product cannot be unassigned while its inventory quantity is greater than zero.'
            );
        }

        const [[usage]] = await connection.query(
            `
            SELECT COUNT(*) AS total
            FROM bar_order_items oi
            INNER JOIN bar_orders bo
                ON bo.order_id = oi.order_id
            WHERE bo.site_id = ?
                AND bo.status = 'OPEN'
                AND oi.product_id = ?
            `,
            [siteId, productId]
        );

        if (Number(usage.total) > 0) {
            throw serviceError(
                409,
                'This product is included in an open order and cannot be unassigned.'
            );
        }

        await connection.query(
            `
            DELETE FROM inventory
            WHERE inventory_id = ?
                AND site_id = ?
                AND quantity = 0
            `,
            [inventoryId, siteId]
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
        action: 'UNASSIGN',
        entity: 'inventory',
        entityId: inventoryId,
        result: 'SUCCESS'
    });

    return {
        inventory_id: inventoryId,
        site_id: siteId,
        product_id: productId,
        assigned: false
    };
}

// ============================================================
// INVENTORY: INCREASE QUANTITY
// ============================================================

async function increment(
    id,
    amount,
    siteId,
    actorId
) {
    id = validateId(
        id,
        'A valid inventory item is required.'
    );

    siteId = validateId(
        siteId,
        'A valid site is required.'
    );

    if (!Number.isInteger(amount) || amount <= 0) {
        throw serviceError(
            400,
            'Quantity must be a positive whole number.'
        );
    }

    const [result] = await pool.query(
        `
        UPDATE inventory
        SET
            quantity = quantity + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE inventory_id = ?
            AND site_id = ?
        `,
        [amount, id, siteId]
    );

    if (!result.affectedRows) {
        throw serviceError(
            404,
            'Inventory item not found for this site.'
        );
    }

    logAuditSafely({
        userId: actorId,
        action: 'INCREMENT',
        entity: 'inventory',
        entityId: id,
        result: 'SUCCESS'
    });

    const [[row]] = await pool.query(
        `
        SELECT *
        FROM inventory
        WHERE inventory_id = ?
            AND site_id = ?
        LIMIT 1
        `,
        [id, siteId]
    );

    return row;
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    list,
    listAssignments,
    listAssignableProducts,
    assignProduct,
    unassignProduct,
    increment
};
