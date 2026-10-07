const pool = require('../config/db');
const audit = require('./auditService');

async function list() {
    const [rows] = await pool.query(`SELECT product_type_id,name,description,status,created_at FROM product_types ORDER BY name ASC`);
    return rows;
}

async function getById(id) {
    const [rows] = await pool.query('SELECT * FROM product_types WHERE product_type_id=? LIMIT 1', [id]);
    return rows[0] || null;
}

async function create(d, a) {
    const [r] = await pool.query(`INSERT INTO product_types(name,description,status) VALUES(?,?,?)`, [d.name, d.description || null, d.status]);
    await audit.log({
        userId: a,
        action: 'CREATE',
        entity: 'product_types',
        entityId: r.insertId,
        result: 'SUCCESS'
    });
    return getById(r.insertId);
}

async function update(id, d, a) {
    await pool.query(`UPDATE product_types SET name=?,description=?,status=? WHERE product_type_id=?`, [d.name, d.description || null, d.status, id]);
    await audit.log({
        userId: a,
        action: 'UPDATE',
        entity: 'product_types',
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