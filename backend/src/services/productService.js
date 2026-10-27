const pool = require('../config/db');
const audit = require('./auditService');

// ============================================================
// AUDIT LOGGING
// ============================================================

function logAuditSafely(entry) {
    Promise.resolve()
        .then(() => audit.log(entry))
        .catch((error) => {
            console.error(
                '[BARLOUNGE] Product audit logging failed:',
                error
            );
        });
}

// ============================================================
// ERROR HELPER
// ============================================================

function serviceError(status, message) {
    const error = new Error(message);

    error.status = status;
    error.publicMessage = message;

    return error;
}

// ============================================================
// VALIDATE PRODUCT ID
// ============================================================

function parseProductId(value) {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw serviceError(
            400,
            'Invalid product ID.'
        );
    }

    return id;
}

// ============================================================
// LIST PRODUCTS
// Products belong to the general catalog.
// This query does not create or change inventory.
// ============================================================

async function list() {
    const [rows] = await pool.query(`
        SELECT
            p.product_id,
            p.code,
            p.name,
            p.purchase_unit,
            p.sale_unit,
            p.purchase_price,
            p.sale_price,
            p.product_type_id,
            pt.name AS product_type,
            p.supplier_id,
            s.name AS supplier,
            p.status,
            p.created_at,
            p.updated_at
        FROM products p
        INNER JOIN product_types pt
            ON pt.product_type_id = p.product_type_id
        INNER JOIN suppliers s
            ON s.supplier_id = p.supplier_id
        ORDER BY p.name ASC
    `);

    return rows;
}

// ============================================================
// GET PRODUCT BY ID
// ============================================================

async function getById(id) {
    const productId = parseProductId(id);

    const [rows] = await pool.query(
        `
        SELECT
            p.product_id,
            p.code,
            p.name,
            p.purchase_unit,
            p.sale_unit,
            p.purchase_price,
            p.sale_price,
            p.product_type_id,
            pt.name AS product_type,
            p.supplier_id,
            s.name AS supplier,
            p.status,
            p.created_at,
            p.updated_at
        FROM products p
        INNER JOIN product_types pt
            ON pt.product_type_id = p.product_type_id
        INNER JOIN suppliers s
            ON s.supplier_id = p.supplier_id
        WHERE p.product_id = ?
        LIMIT 1
        `,
        [productId]
    );

    return rows[0] || null;
}

// ============================================================
// CREATE PRODUCT
//
// IMPORTANT:
// This method creates a product in the global catalog only.
// It does not insert records into the inventory table.
// Product assignment is handled by Product Assignment.
// ============================================================

async function create(data, actorId) {
    const connection = await pool.getConnection();

    let productId;

    try {
        await connection.beginTransaction();

        const purchasePrice = Number(
            data.purchasePrice
        );

        const salePrice = Number(
            data.salePrice
        );

        const [result] = await connection.query(
            `
            INSERT INTO products (
                code,
                name,
                purchase_unit,
                sale_unit,
                purchase_price,
                product_type_id,
                supplier_id,
                sale_price,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                data.code.trim(),
                data.name.trim(),
                data.purchaseUnit.trim(),
                data.saleUnit.trim(),
                purchasePrice,
                Number(data.productTypeId),
                Number(data.supplierId),
                salePrice,
                data.status
            ]
        );

        productId = result.insertId;

        await connection.commit();
    } catch (error) {
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error(
                '[BARLOUNGE] Product create rollback failed:',
                rollbackError
            );
        }

        if (error.code === 'ER_DUP_ENTRY') {
            throw serviceError(
                409,
                'A product with this code already exists.'
            );
        }

        throw error;
    } finally {
        connection.release();
    }

    logAuditSafely({
        userId: actorId,
        action: 'CREATE',
        entity: 'products',
        entityId: productId,
        result: 'SUCCESS'
    });

    return getById(productId);
}

// ============================================================
// UPDATE PRODUCT
//
// Updates the catalog information and prices only.
// Existing inventory assignments and quantities are unchanged.
// ============================================================

async function update(id, data, actorId) {
    const productId = parseProductId(id);

    const existingProduct = await getById(
        productId
    );

    if (!existingProduct) {
        throw serviceError(
            404,
            'Product not found.'
        );
    }

    const purchasePrice = Number(
        data.purchasePrice
    );

    const salePrice = Number(
        data.salePrice
    );

    try {
        await pool.query(
            `
            UPDATE products
            SET
                code = ?,
                name = ?,
                purchase_unit = ?,
                sale_unit = ?,
                purchase_price = ?,
                product_type_id = ?,
                supplier_id = ?,
                sale_price = ?,
                status = ?
            WHERE product_id = ?
            `,
            [
                data.code.trim(),
                data.name.trim(),
                data.purchaseUnit.trim(),
                data.saleUnit.trim(),
                purchasePrice,
                Number(data.productTypeId),
                Number(data.supplierId),
                salePrice,
                data.status,
                productId
            ]
        );
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            throw serviceError(
                409,
                'A product with this code already exists.'
            );
        }

        throw error;
    }

    logAuditSafely({
        userId: actorId,
        action: 'UPDATE',
        entity: 'products',
        entityId: productId,
        result: 'SUCCESS'
    });

    return getById(productId);
}

// ============================================================
// EXPORT SERVICE
// ============================================================

module.exports = {
    list,
    getById,
    create,
    update
};