const pool = require('../config/db');

function buildFilters(startDate, endDate, siteId) {
    const conditions = [
        'ii.requested_at >= ?',
        'ii.requested_at < DATE_ADD(?, INTERVAL 1 DAY)',
        "op.payment_status = 'COMPLETED'"
    ];

    const values = [startDate, endDate];

    if (siteId) {
        conditions.push('i.site_id = ?');
        values.push(siteId);
    }

    return {
        sql: conditions.join(' AND '),
        values
    };
}

function normalizeNumber(value) {
    return Number(value || 0);
}

// ============================================================
// HU16 - SALES REPORT
// ============================================================

async function getSalesReport({
    startDate,
    endDate,
    siteId
}) {
    const filters = buildFilters(
        startDate,
        endDate,
        siteId
    );

    const [rows] = await pool.query(
        `
        SELECT
            ii.requested_at,
            i.invoice_number,
            s.site_id,
            s.name AS site_name,
            ii.product_code,
            ii.product_name,
            ii.quantity,
            ii.unit_price,
            ii.purchase_price,
            ii.line_total,
            ROUND(
                ii.quantity * ii.purchase_price,
                2
            ) AS purchase_total,
            ROUND(
                ii.line_total -
                (ii.quantity * ii.purchase_price),
                2
            ) AS profit
        FROM invoice_items ii
        INNER JOIN invoices i
            ON i.invoice_id = ii.invoice_id
        INNER JOIN order_payments op
            ON op.payment_id = i.payment_id
        INNER JOIN sites s
            ON s.site_id = i.site_id
        WHERE ${filters.sql}
        ORDER BY
            ii.requested_at DESC,
            s.name ASC,
            ii.product_name ASC
        `,
        filters.values
    );

    const details = rows.map(row => ({
        ...row,
        quantity: normalizeNumber(row.quantity),
        unit_price: normalizeNumber(row.unit_price),
        purchase_price: normalizeNumber(row.purchase_price),
        line_total: normalizeNumber(row.line_total),
        purchase_total: normalizeNumber(row.purchase_total),
        profit: normalizeNumber(row.profit)
    }));

    const summary = details.reduce(
        (totals, row) => {
            totals.units += row.quantity;
            totals.sales += row.line_total;
            totals.cost += row.purchase_total;
            totals.profit += row.profit;

            return totals;
        },
        {
            units: 0,
            sales: 0,
            cost: 0,
            profit: 0
        }
    );

    return {
        summary,
        rows: details
    };
}

// ============================================================
// HU18 - BEST-SELLING PRODUCTS
// ============================================================

async function getTopProductsReport({
    startDate,
    endDate,
    siteId
}) {
    const filters = buildFilters(
        startDate,
        endDate,
        siteId
    );

    const [rows] = await pool.query(
        `
        SELECT
            ii.product_code,
            ii.product_name,
            SUM(ii.quantity) AS units_sold,
            ROUND(SUM(ii.line_total), 2) AS sales,
            ROUND(
                SUM(ii.quantity * ii.purchase_price),
                2
            ) AS cost,
            ROUND(
                SUM(
                    ii.line_total -
                    (ii.quantity * ii.purchase_price)
                ),
                2
            ) AS profit
        FROM invoice_items ii
        INNER JOIN invoices i
            ON i.invoice_id = ii.invoice_id
        INNER JOIN order_payments op
            ON op.payment_id = i.payment_id
        WHERE ${filters.sql}
        GROUP BY
            ii.product_code,
            ii.product_name
        ORDER BY
            units_sold DESC,
            sales DESC
        LIMIT 20
        `,
        filters.values
    );

    return rows.map(row => ({
        ...row,
        units_sold: normalizeNumber(row.units_sold),
        sales: normalizeNumber(row.sales),
        cost: normalizeNumber(row.cost),
        profit: normalizeNumber(row.profit)
    }));
}

// ============================================================
// HU17 - INVENTORY BY SITE
// ============================================================

async function getInventoryReport(siteId = null) {
    const values = [];
    let siteCondition = '';

    if (siteId) {
        siteCondition = 'WHERE s.site_id = ?';
        values.push(siteId);
    }

    const [rows] = await pool.query(
        `
        SELECT
            s.site_id,
            s.name AS site_name,
            p.product_id,
            p.code AS product_code,
            p.name AS product_name,
            p.purchase_unit,
            p.sale_unit,
            i.quantity,
            p.purchase_price,
            p.sale_price,
            ROUND(
                i.quantity * p.purchase_price,
                2
            ) AS inventory_purchase_value,
            ROUND(
                i.quantity * p.sale_price,
                2
            ) AS inventory_sale_value
        FROM inventory i
        INNER JOIN sites s
            ON s.site_id = i.site_id
        INNER JOIN products p
            ON p.product_id = i.product_id
        ${siteCondition}
        ORDER BY
            s.name ASC,
            p.name ASC
        `,
        values
    );

    return rows.map(row => ({
        ...row,
        quantity: normalizeNumber(row.quantity),
        purchase_price: normalizeNumber(row.purchase_price),
        sale_price: normalizeNumber(row.sale_price),
        inventory_purchase_value:
            normalizeNumber(row.inventory_purchase_value),
        inventory_sale_value:
            normalizeNumber(row.inventory_sale_value)
    }));
}

module.exports = {
    getSalesReport,
    getTopProductsReport,
    getInventoryReport
};