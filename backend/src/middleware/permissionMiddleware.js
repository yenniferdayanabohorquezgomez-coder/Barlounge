const pool = require('../config/db');

function requirePermission(permissionName) {
  return async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT 1 FROM role_permissions rp
          INNER JOIN permissions p ON p.permission_id = rp.permission_id
          WHERE rp.role_id = ? AND p.name = ? AND p.status = 'ACTIVE'
          LIMIT 1`,
        [req.user.role_id, permissionName]
      );
      if (!rows.length) return res.status(403).json({ message: 'You do not have permission to perform this action.' });
      next();
    } catch (error) { next(error); }
  };
}
module.exports = { requirePermission };
