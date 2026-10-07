const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required.' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      `SELECT u.user_id, u.code, u.name, u.role_id, u.site_id, u.status,
              r.name AS role_name, s.name AS site_name
        FROM users u
        INNER JOIN roles r ON r.role_id = u.role_id
        INNER JOIN sites s ON s.site_id = u.site_id
        WHERE u.user_id = ? LIMIT 1`,
      [payload.userId]
    );

    if (!rows.length || rows[0].status !== 'ACTIVE') {
      return res.status(403).json({ message: 'User is inactive or not authorized.' });
    }
    req.user = rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
}

module.exports = { requireAuth };
