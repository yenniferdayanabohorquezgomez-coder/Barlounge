const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization || '';

        const token = header.startsWith('Bearer ')
            ? header.slice(7)
            : null;

        if (!token) {
            return res.status(401).json({
                message: 'Authentication required.'
            });
        }

        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // No permitir que un token de recuperación
        // se utilice para acceder a la API.
        if (
            payload.purpose !== 'access' ||
            !payload.userId ||
            !payload.sid
        ) {
            return res.status(401).json({
                message: 'Invalid access session.'
            });
        }

        // Validar sesión, expiración y actividad.
        const [sessionResult] = await pool.query(
            `
            UPDATE auth_sessions
            SET last_activity = CURRENT_TIMESTAMP
            WHERE session_id = ?
              AND user_id = ?
              AND revoked_at IS NULL
              AND expires_at > CURRENT_TIMESTAMP
              AND last_activity >= DATE_SUB(
                  CURRENT_TIMESTAMP,
                  INTERVAL 3 MINUTE
              )
            `,
            [
                payload.sid,
                payload.userId
            ]
        );

        if (!sessionResult.affectedRows) {
            return res.status(401).json({
                message: 'Your session has expired. Please sign in again.'
            });
        }

        // Consultar usuario activo.
        const [rows] = await pool.query(
            `
            SELECT
                u.user_id,
                u.code,
                u.name,
                u.role_id,
                u.site_id,
                u.status,
                r.name AS role_name,
                s.name AS site_name
            FROM users u
            INNER JOIN roles r
                ON r.role_id = u.role_id
            INNER JOIN sites s
                ON s.site_id = u.site_id
            WHERE u.user_id = ?
            LIMIT 1
            `,
            [payload.userId]
        );

        if (
            !rows.length ||
            rows[0].status !== 'ACTIVE'
        ) {
            return res.status(403).json({
                message: 'User is inactive or not authorized.'
            });
        }

        req.user = rows[0];
        req.authSessionId = payload.sid;

        next();

    } catch (error) {
        return res.status(401).json({
            message: 'Invalid or expired session.'
        });
    }
}

module.exports = {
    requireAuth
};