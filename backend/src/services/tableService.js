
const pool = require('../config/db');

// ============================================================
// LISTAR MESAS POR SEDE
// ============================================================

async function list(siteId) {
    const normalizedSiteId = Number(siteId);

    if (
        !Number.isInteger(normalizedSiteId) ||
        normalizedSiteId <= 0
    ) {
        const error = new Error('Invalid site.');
        error.status = 400;
        error.publicMessage = 'Select a valid site.';
        throw error;
    }

    const [sites] = await pool.query(
        `
        SELECT site_id, name
        FROM sites
        WHERE site_id = ?
          AND status = 'ACTIVE'
        LIMIT 1
        `,
        [normalizedSiteId]
    );

    if (!sites.length) {
        const error = new Error('Site not found.');
        error.status = 404;
        error.publicMessage =
            'The selected site is not active or does not exist.';
        throw error;
    }

    const [rows] = await pool.query(
        `
        SELECT
            dt.table_id,
            dt.site_id,
            s.name AS site,
            dt.table_number,
            CASE
                WHEN bo.order_id IS NOT NULL
                    THEN 'OCCUPIED'
                ELSE dt.status
            END AS status,
            bo.order_id,
            bo.waiter_id,
            bo.opened_at
        FROM dining_tables dt
        INNER JOIN sites s
            ON s.site_id = dt.site_id
        LEFT JOIN (
            SELECT
                table_id,
                MAX(order_id) AS order_id
            FROM bar_orders
            WHERE status = 'OPEN'
            GROUP BY table_id
        ) open_orders
            ON open_orders.table_id = dt.table_id
        LEFT JOIN bar_orders bo
            ON bo.order_id = open_orders.order_id
        WHERE dt.site_id = ?
        ORDER BY
            CAST(dt.table_number AS UNSIGNED),
            dt.table_number
        `,
        [normalizedSiteId]
    );

    return rows;
}

// ============================================================
// CREAR MESA
// ============================================================

async function create(siteId, tableNumber) {
    const normalizedSiteId = Number(siteId);

    const normalizedNumber = String(
        tableNumber ?? ''
    ).trim();

    // Validar sede
    if (
        !Number.isInteger(normalizedSiteId) ||
        normalizedSiteId <= 0
    ) {
        const error = new Error('Invalid site.');
        error.status = 400;
        error.publicMessage = 'Select a valid site.';
        throw error;
    }

    // Validar número de mesa
    if (
        !normalizedNumber ||
        normalizedNumber.length > 10
    ) {
        const error = new Error('Invalid table number.');
        error.status = 400;
        error.publicMessage =
            'Enter a table number with a maximum of 10 characters.';
        throw error;
    }

    // Verificar sede activa
    const [sites] = await pool.query(
        `
        SELECT site_id
        FROM sites
        WHERE site_id = ?
          AND status = 'ACTIVE'
        LIMIT 1
        `,
        [normalizedSiteId]
    );

    if (!sites.length) {
        const error = new Error('Site not found.');
        error.status = 404;
        error.publicMessage =
            'The selected site is not active or does not exist.';
        throw error;
    }

    // Verificar duplicado dentro de la misma sede
    const [existing] = await pool.query(
        `
        SELECT table_id
        FROM dining_tables
        WHERE site_id = ?
          AND table_number = ?
        LIMIT 1
        `,
        [
            normalizedSiteId,
            normalizedNumber
        ]
    );

    if (existing.length) {
        const error = new Error(
            'Table already exists.'
        );

        error.status = 409;
        error.publicMessage =
            'A table with that number already exists at this site.';

        throw error;
    }

    // Crear mesa
    const [result] = await pool.query(
        `
        INSERT INTO dining_tables (
            site_id,
            table_number,
            status
        )
        VALUES (?, ?, 'FREE')
        `,
        [
            normalizedSiteId,
            normalizedNumber
        ]
    );

    return {
        table_id: result.insertId,
        site_id: normalizedSiteId,
        table_number: normalizedNumber,
        status: 'FREE'
    };
}

module.exports = {
    list,
    create
};
