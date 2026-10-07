const pool = require('../config/db');
const audit = require('./auditService');

async function list(siteId) {
    const [rows] = await pool.query(`SELECT i.inventory_id,i.site_id,st.name AS site,i.product_id,p.code,p.name AS product,p.sale_unit,i.quantity,i.updated_at FROM inventory i INNER JOIN sites st ON st.site_id=i.site_id INNER JOIN products p ON p.product_id=i.product_id WHERE i.site_id=? ORDER BY p.name ASC`, [siteId]);
    return rows;
}

async function increment(id, amount, siteId, actorId) {
    if (!Number.isInteger(amount) || amount <= 0) {
        const e = new Error('invalid amount');
        e.status = 400;
        e.publicMessage = 'Quantity must be a positive whole number.';
        throw e;
    }
    const [r] = await pool.query(`UPDATE inventory SET quantity=quantity+?,updated_at=CURRENT_TIMESTAMP WHERE inventory_id=? AND site_id=?`, [amount, id, siteId]);
    if (!r.affectedRows) {
        const e = new Error('not found');
        e.status = 404;
        e.publicMessage = 'Inventory item not found for this site.';
        throw e;
    }
    await audit.log({
        userId: actorId,
        action: 'INCREMENT',
        entity: 'inventory',
        entityId: id,
        result: 'SUCCESS'
    });
    const [[row]] = await pool.query('SELECT * FROM inventory WHERE inventory_id=? LIMIT 1', [id]);
    return row;
}

module.exports = {
    list,
    increment
};