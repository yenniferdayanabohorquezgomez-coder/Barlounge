const pool = require('../config/db');
const audit = require('./auditService');

async function list() {
    const [rows] = await pool.query(`SELECT supplier_id,name,contact,status,created_at FROM suppliers ORDER BY name ASC`);
    return rows;
}

async function getById(id) {
    const [rows] = await pool.query('SELECT * FROM suppliers WHERE supplier_id=? LIMIT 1', [id]);
    return rows[0] || null;
}

async function create(d, a) {
    const [r] = await pool.query(`INSERT INTO suppliers(name,contact,status) VALUES(?,?,?)`, [d.name, d.contact || null, d.status]);
    await audit.log({
        userId: a,
        action: 'CREATE',
        entity: 'suppliers',
        entityId: r.insertId,
        result: 'SUCCESS'
    });
    return getById(r.insertId);
}

async function update(id, d, a) {
    await pool.query(`UPDATE suppliers SET name=?,contact=?,status=? WHERE supplier_id=?`, [d.name, d.contact || null, d.status, id]);
    await audit.log({
        userId: a,
        action: 'UPDATE',
        entity: 'suppliers',
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