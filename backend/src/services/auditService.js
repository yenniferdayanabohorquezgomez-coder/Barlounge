const pool = require('../config/db');

async function log({ userId, action, entity, entityId = null, result }) {
  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, result)
      VALUES (?, ?, ?, ?, ?)`,
    [userId || null, action, entity, entityId, result]
  );
}
module.exports = { log };
