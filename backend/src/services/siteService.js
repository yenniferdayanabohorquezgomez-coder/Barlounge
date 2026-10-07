const pool = require('../config/db');
const audit = require('./auditService');

async function list() {
  const [rows] = await pool.query(`SELECT site_id,code,name,address,status,created_at,updated_at FROM sites ORDER BY name ASC`);
  return rows;
}

async function getById(id) {
  const [rows] = await pool.query('SELECT * FROM sites WHERE site_id=? LIMIT 1', [id]);
  return rows[0] || null;
}

async function create(data, actorId) {
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const [r] = await c.query(`INSERT INTO sites(code,name,address,status) VALUES(?,?,?,?)`, [data.code, data.name, data.address, data.status]);
    const [products] = await c.query(`SELECT product_id FROM products WHERE status='ACTIVE'`);
    if (products.length) {
      const values = products.map(p => [r.insertId, p.product_id, 0]);
      await c.query(`INSERT INTO inventory(site_id,product_id,quantity) VALUES ?`, [values]);
    }
    await c.commit();
    await audit.log({
      userId: actorId,
      action: 'CREATE',
      entity: 'sites',
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

async function update(id, data, actorId) {
  await pool.query(`UPDATE sites SET name=?,address=?,status=? WHERE site_id=?`, [data.name, data.address, data.status, id]);
  await audit.log({
    userId: actorId,
    action: 'UPDATE',
    entity: 'sites',
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