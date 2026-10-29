const pool = require('../config/db');

async function getSummary() {
    // ==========================================
    // 1. CONTADORES DEL DASHBOARD
    // ==========================================
    const [[users]] = await pool.query(
        'SELECT COUNT(*) AS total FROM users'
    );

    const [[sites]] = await pool.query(
        'SELECT COUNT(*) AS total FROM sites'
    );

    const [[products]] = await pool.query(
        'SELECT COUNT(*) AS total FROM products'
    );

    const [[inventory]] = await pool.query(
        `SELECT COALESCE(SUM(quantity), 0) AS total
         FROM inventory`
    );

    const [[ordersCount]] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM bar_orders
         WHERE status = 'OPEN'`
    );

    const [[salesTotal]] = await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS total
         FROM order_payments
         WHERE payment_status = 'COMPLETED'`
    );

    // ==========================================
    // 2. PEDIDOS ABIERTOS
    // ==========================================
    const [openOrders] = await pool.query(
        `SELECT
            bo.order_id,
            dt.table_number,
            bo.site_id,
            s.name AS site_name,
            COALESCE(SUM(
                boi.quantity * boi.unit_price
            ), 0) AS total
         FROM bar_orders bo
         INNER JOIN dining_tables dt
            ON dt.table_id = bo.table_id
         INNER JOIN sites s
            ON s.site_id = bo.site_id
         LEFT JOIN bar_order_items boi
            ON boi.order_id = bo.order_id
         WHERE bo.status = 'OPEN'
         GROUP BY
            bo.order_id,
            dt.table_number,
            bo.site_id,
            s.name,
            bo.opened_at
         ORDER BY bo.opened_at DESC
         LIMIT 10`
    );

    // ==========================================
    // 3. VENTAS COMPLETADAS POR SEDE
    // ==========================================
    const [salesBySite] = await pool.query(
        `SELECT
            s.site_id,
            s.name AS site_name,
            COALESCE(SUM(op.total_amount), 0) AS total
         FROM sites s
         LEFT JOIN bar_orders bo
            ON bo.site_id = s.site_id
         LEFT JOIN order_payments op
            ON op.order_id = bo.order_id
            AND op.payment_status = 'COMPLETED'
         GROUP BY s.site_id, s.name
         ORDER BY total DESC, s.name ASC`
    );

    // ==========================================
    // 4. RESPUESTA PARA EL FRONTEND
    // ==========================================
    return {
        users: Number(users.total),
        sites: Number(sites.total),
        products: Number(products.total),
        inventoryUnits: Number(inventory.total),
        orders: Number(ordersCount.total),
        sales: Number(salesTotal.total),

        openOrders: openOrders.map(order => ({
            ...order,
            order_id: Number(order.order_id),
            table_number: order.table_number,
            total: Number(order.total)
        })),

        salesBySite: salesBySite.map(site => ({
            site_id: Number(site.site_id),
            site_name: site.site_name,
            total: Number(site.total)
        }))
    };
}

module.exports = {
    getSummary
};