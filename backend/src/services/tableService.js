const pool = require('../config/db');

// ============================================================
// LISTAR MESAS POR SEDE
// ============================================================
//
// Devuelve todas las mesas de una sede activa.
// Si una mesa tiene un pedido OPEN, se muestra como OCCUPIED.
//
// La consulta no modifica los pedidos ni el inventario.
// ============================================================
async function list(siteId) {

    // --------------------------------------------------------
    // Validar el identificador de sede
    // --------------------------------------------------------
    if (
        !Number.isInteger(Number(siteId)) ||
        Number(siteId) <= 0
    ) {
        const error = new Error('Invalid site.');
        error.status = 400;
        error.publicMessage = 'Select a valid site.';
        throw error;
    }

    // --------------------------------------------------------
    // Comprobar que la sede existe y está activa
    // --------------------------------------------------------

    const [sites] = await pool.query(
            `SELECT site_id, name
            FROM sites
            WHERE site_id = ?
            AND status = 'ACTIVE'
            LIMIT 1`,
        [siteId]
    );

    if (!sites.length) {
        const error = new Error('Site not found.');
        error.status = 404;
        error.publicMessage = 'The selected site is not active or does not exist.';
        throw error;
    }

    // --------------------------------------------------------
    // Consultar las mesas y sus pedidos abiertos
    // --------------------------------------------------------
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
        [siteId]
    );

    return rows;
}

// ============================================================
// EXPORTAR SERVICIO
// ============================================================
module.exports = {
    list
};