const pool = require('../config/db');
const audit = require('./auditService');

function logAuditSafely(entry) {
    Promise.resolve()
        .then(() => audit.log(entry))
        .catch((error) => {
            console.error(
                '[BARLOUNGE] Site audit error:',
                error
            );
        });
}

async function list() {
  const [rows] = await pool.query(`SELECT site_id,code,name,address,status,created_at,updated_at FROM sites ORDER BY name ASC`);
  return rows;
}

async function getById(id) {
  const [rows] = await pool.query('SELECT * FROM sites WHERE site_id=? LIMIT 1', [id]);
  return rows[0] || null;
}


async function create(data, actorId) {
    const connection = await pool.getConnection();

    let siteId;

    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            `
            INSERT INTO sites (
                code,
                name,
                address,
                status
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                data.code,
                data.name,
                data.address,
                data.status
            ]
        );

        siteId = result.insertId;

        // Products are assigned to this site separately
        // through the Product Assignment module.

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    logAuditSafely({
        userId: actorId,
        action: 'CREATE',
        entity: 'sites',
        entityId: siteId,
        result: 'SUCCESS'
    });

    return getById(siteId);
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