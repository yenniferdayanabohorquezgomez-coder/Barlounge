const pool = require('../config/db');
const audit = require('./auditService');

async function list() {
    const [rows] = await pool.query(`SELECT p.product_id,p.code,p.name,p.purchase_unit,p.sale_unit,p.product_type_id,pt.name AS product_type,p.supplier_id,s.name AS supplier,p.sale_price,p.status,p.created_at,p.updated_at FROM products p INNER JOIN product_types pt ON pt.product_type_id=p.product_type_id INNER JOIN suppliers s ON s.supplier_id=p.supplier_id ORDER BY p.name ASC`);
    return rows;
}

async function getById(id) {
    const [rows] = await pool.query(`SELECT p.product_id,p.code,p.name,p.purchase_unit,p.sale_unit,p.product_type_id,pt.name AS product_type,p.supplier_id,s.name AS supplier,p.sale_price,p.status FROM products p INNER JOIN product_types pt ON pt.product_type_id=p.product_type_id INNER JOIN suppliers s ON s.supplier_id=p.supplier_id WHERE p.product_id=? LIMIT 1`, [id]);
    return rows[0] || null;
}

async function create(d, a) {
    const c = await pool.getConnection();
    try {
        await c.beginTransaction();
        const [r] = await c.query(`INSERT INTO products(code,name,purchase_unit,sale_unit,product_type_id,supplier_id,sale_price,status) VALUES(?,?,?,?,?,?,?,?)`, [d.code, d.name, d.purchaseUnit, d.saleUnit, d.productTypeId, d.supplierId, d.salePrice, d.status]);
        const [sites] = await c.query(`SELECT site_id FROM sites WHERE status='ACTIVE'`);
        if (sites.length) {
            const values = sites.map(s => [s.site_id, r.insertId, 0]);
            await c.query(`INSERT INTO inventory(site_id,product_id,quantity) VALUES ?`, [values]);
        }
        await c.commit();
        await audit.log({
            userId: a,
            action: 'CREATE',
            entity: 'products',
            entityId: r.insertId,
            result: 'SUCCESS'
        });
        return getById(r.insertId);
    } catch (e) {
        await c.rollback();
        throw e;
    } finally {
        c.release();
    }
}

async function update(id, d, a) {
    await pool.query(`UPDATE products SET code=?,name=?,purchase_unit=?,sale_unit=?,product_type_id=?,supplier_id=?,sale_price=?,status=? WHERE product_id=?`, [d.code, d.name, d.purchaseUnit, d.saleUnit, d.productTypeId, d.supplierId, d.salePrice, d.status, id]);
    await audit.log({
        userId: a,
        action: 'UPDATE',
        entity: 'products',
        entityId: id,
        result: 'SUCCESS'
    });
    return getById(id);
}

module.exports = {
    list,
    getById,
    create,
    update
};