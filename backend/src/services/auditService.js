const pool = require('../config/db');

// ============================================================
// REGISTRAR UNA OPERACIÓN
// Conservamos esta función porque ya la utilizan otros módulos.
// ============================================================
async function log({
    userId,
    action,
    entity,
    entityId = null,
    result
}) {
    await pool.query(
        `
        INSERT INTO audit_logs (
            user_id,
            action,
            entity,
            entity_id,
            result
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            userId || null,
            action,
            entity,
            entityId,
            result
        ]
    );
}

// ============================================================
// CONSULTAR TRAZABILIDAD
// HU35
// ============================================================

async function list({
    startDate = null,
    endDate = null,
    search = '',
    page = 1,
    pageSize = 20
}) {
    const conditions = [];
    const values = [];

    if (startDate) {
        conditions.push(
            'al.created_at >= ?'
        );

        values.push(startDate);
    }

    if (endDate) {
        conditions.push(
            'al.created_at < DATE_ADD(?, INTERVAL 1 DAY)'
        );

        values.push(endDate);
    }

    if (search) {
        conditions.push(`
            (
                al.action LIKE ?
                OR al.entity LIKE ?
                OR al.result LIKE ?
                OR CAST(al.entity_id AS CHAR) LIKE ?
                OR u.name LIKE ?
                OR u.code LIKE ?
            )
        `);

        const term = `%${search}%`;

        values.push(
            term,
            term,
            term,
            term,
            term,
            term
        );
    }

    const where = conditions.length
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    // --------------------------------------------------------
    // TOTAL DE REGISTROS
    // --------------------------------------------------------

    const [[count]] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM audit_logs al
        LEFT JOIN users u
            ON u.user_id = al.user_id
        ${where}
        `,
        values
    );

    const total = Number(count.total || 0);

    const offset = (page - 1) * pageSize;

    // --------------------------------------------------------
    // CONSULTAR REGISTROS
    // --------------------------------------------------------

    const [rows] = await pool.query(
        `
        SELECT
            al.audit_id,
            al.user_id,
            COALESCE(u.name, 'Deleted or unavailable user')
                AS user_name,
            u.code AS user_code,
            al.action,
            al.entity,
            al.entity_id,
            al.result,
            al.created_at
        FROM audit_logs al
        LEFT JOIN users u
            ON u.user_id = al.user_id
        ${where}
        ORDER BY
            al.created_at DESC,
            al.audit_id DESC
        LIMIT ? OFFSET ?
        `,
        [
            ...values,
            pageSize,
            offset
        ]
    );

    return {
        rows,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
    };
}

module.exports = {
    log,
    list
};