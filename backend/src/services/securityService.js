
const pool = require('../config/db');

// ============================================================
// SECURITY OVERVIEW
// HU37 - View security controls and session status
// ============================================================

async function getSecurityOverview(userId, sessionId) {
    // Current authenticated session.
    const [currentRows] = await pool.query(
        `
        SELECT
            session_id,
            created_at,
            last_activity,
            expires_at,
            revoked_at
        FROM auth_sessions
        WHERE session_id = ?
          AND user_id = ?
          AND revoked_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
          AND last_activity >= DATE_SUB(
              CURRENT_TIMESTAMP,
              INTERVAL 3 MINUTE
          )
        LIMIT 1
        `,
        [sessionId, userId]
    );

    // Active sessions follow the same conditions as authMiddleware.
    const [summaryRows] = await pool.query(
        `
        SELECT
            COUNT(*) AS active_sessions,
            COUNT(DISTINCT user_id) AS users_with_active_sessions
        FROM auth_sessions
        WHERE revoked_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
          AND last_activity >= DATE_SUB(
              CURRENT_TIMESTAMP,
              INTERVAL 3 MINUTE
          )
        `
    );

    // Detect users with more than one active session.
    const [duplicateRows] = await pool.query(
        `
        SELECT
            u.user_id,
            u.code,
            u.name,
            r.name AS role_name,
            COUNT(s.session_id) AS active_session_count
        FROM auth_sessions s
        INNER JOIN users u
            ON u.user_id = s.user_id
        INNER JOIN roles r
            ON r.role_id = u.role_id
        WHERE s.revoked_at IS NULL
          AND s.expires_at > CURRENT_TIMESTAMP
          AND s.last_activity >= DATE_SUB(
              CURRENT_TIMESTAMP,
              INTERVAL 3 MINUTE
          )
        GROUP BY
            u.user_id,
            u.code,
            u.name,
            r.name
        HAVING COUNT(s.session_id) > 1
        ORDER BY active_session_count DESC
        LIMIT 50
        `
    );

    // List current active sessions without exposing session tokens or IDs.
    const [activeSessions] = await pool.query(
        `
        SELECT
            u.code,
            u.name,
            r.name AS role_name,
            s.name AS site_name,
            a.created_at,
            a.last_activity,
            a.expires_at
        FROM auth_sessions a
        INNER JOIN users u
            ON u.user_id = a.user_id
        INNER JOIN roles r
            ON r.role_id = u.role_id
        INNER JOIN sites s
            ON s.site_id = u.site_id
        WHERE a.revoked_at IS NULL
          AND a.expires_at > CURRENT_TIMESTAMP
          AND a.last_activity >= DATE_SUB(
              CURRENT_TIMESTAMP,
              INTERVAL 3 MINUTE
          )
          AND u.status = 'ACTIVE'
        ORDER BY a.last_activity DESC
        LIMIT 50
        `
    );

    const currentSession = currentRows[0] || null;
    const summary = summaryRows[0] || {};

    return {
        controls: [
            {
                name: 'JWT authentication',
                status: process.env.JWT_SECRET
                    ? 'ACTIVE'
                    : 'NOT_CONFIGURED',
                detail: 'Protected API requests require a signed access token.'
            },
            {
                name: 'Password protection',
                status: 'ACTIVE',
                detail: 'User passwords are verified using bcryptjs hashes.'
            },
            {
                name: 'Role-based access control',
                status: 'ACTIVE',
                detail: 'Protected routes verify permissions assigned to user roles.'
            },
            {
                name: 'Single active session policy',
                status: 'ACTIVE',
                detail: 'A new login revokes the user previous active sessions.'
            },
            {
                name: 'Session inactivity',
                status: 'ACTIVE',
                detail: 'Sessions expire after three minutes without activity.'
            },
            {
                name: 'Input validation',
                status: 'PARTIAL',
                detail: 'Validation exists in selected controllers and services; coverage must be reviewed across all endpoints.'
            },
            {
                name: 'Audit logging',
                status: 'ACTIVE',
                detail: 'Relevant operations are recorded in the audit log.'
            }
        ],

        sessionPolicy: {
            inactivityMinutes: 3,
            singleSessionPerUser: true
        },

        currentSession: currentSession
            ? {
                status: 'ACTIVE',
                createdAt: currentSession.created_at,
                lastActivity: currentSession.last_activity,
                expiresAt: currentSession.expires_at
            }
            : {
                status: 'NOT_FOUND',
                createdAt: null,
                lastActivity: null,
                expiresAt: null
            },

        summary: {
            activeSessions: Number(summary.active_sessions || 0),
            usersWithActiveSessions: Number(
                summary.users_with_active_sessions || 0
            ),
            usersWithMultipleSessions: duplicateRows.length
        },

        multipleSessions: duplicateRows,

        activeSessions
    };
}

module.exports = {
    getSecurityOverview
};
