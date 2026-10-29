const pool = require('../config/db');
const audit = require('./auditService');

const {
    calculateOrderTotals
} = require('../utils/iterativoOrderTotals');

function serviceError(status, message) {
    const error = new Error(message);
    error.status = status;
    error.publicMessage = message;
    return error;
}

function validateId(value, message) {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw serviceError(400, message);
    }

    return id;
}

function money(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function logAuditSafely(entry) {
    Promise.resolve()
        .then(() => audit.log(entry))
        .catch((error) => {
            console.error(
                '[BARLOUNGE] Cash register audit failed:',
                error
            );
        });
}

function normalizeOptionalText(value, maxLength) {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim();

    return normalized ? normalized.slice(0, maxLength) : null;
}

// ============================================================
// PROCESS PAYMENT, CREATE INVOICE AND CLOSE ORDER
// All operations succeed together or are rolled back.
// ============================================================

async function processPayment(
    orderId,
    siteId,
    actorId,
    paymentMethod,
    cashReceived,
    buyer = {}
) {
    orderId = validateId(orderId, 'Invalid order.');
    siteId = validateId(siteId, 'Select a valid site.');
    actorId = validateId(actorId, 'Invalid cashier.');

    const allowedMethods = [
        'CASH',
        'CREDIT_CARD',
        'DEBIT_CARD'
    ];

    if (!allowedMethods.includes(paymentMethod)) {
        throw serviceError(
            400,
            'Select a valid payment method.'
        );
    }

    if (
        paymentMethod === 'CASH' &&
        (
            cashReceived === undefined ||
            cashReceived === null ||
            cashReceived === '' ||
            !Number.isFinite(Number(cashReceived)) ||
            Number(cashReceived) < 0
        )
    ) {
        throw serviceError(
            400,
            'Enter the cash received from the customer.'
        );
    }

    // Validate and normalize buyer information.
    const buyerName = normalizeOptionalText(
        buyer?.buyerName,
        150
    );

    const allowedDocumentTypes = [
        'CC',
        'CE',
        'NIT',
        'PASSPORT',
        'OTHER'
    ];

    let buyerDocumentType = normalizeOptionalText(
        buyer?.buyerDocumentType,
        30
    );

    const buyerDocument = normalizeOptionalText(
        buyer?.buyerDocument,
        40
    );

    if (buyerDocumentType) {
        buyerDocumentType = buyerDocumentType.toUpperCase();

        if (!allowedDocumentTypes.includes(buyerDocumentType)) {
            throw serviceError(
                400,
                'Select a valid buyer document type.'
            );
        }
    }

    if (buyerDocument && !buyerDocumentType) {
        throw serviceError(
            400,
            'Select the buyer document type.'
        );
    }

    const connection = await pool.getConnection();

    let result;

    try {
        await connection.beginTransaction();

        // Lock the order to prevent concurrent payments.
        const [orders] = await connection.query(
            `
            SELECT
                order_id,
                table_id,
                site_id,
                status
            FROM bar_orders
            WHERE order_id = ?
              AND site_id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [orderId, siteId]
        );

        if (!orders.length) {
            throw serviceError(
                404,
                'Order not found for this site.'
            );
        }

        const order = orders[0];

        if (order.status !== 'OPEN') {
            throw serviceError(
                409,
                'This order is not open and cannot be paid again.'
            );
        }

        // Lock the table and confirm that it belongs to this site.
        const [tables] = await connection.query(
            `
            SELECT table_id, status
            FROM dining_tables
            WHERE table_id = ?
              AND site_id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [order.table_id, siteId]
        );

        if (!tables.length) {
            throw serviceError(
                404,
                'The table for this order was not found.'
            );
        }

        // Read the order items from the database.
        const [items] = await connection.query(
            `
            SELECT
                oi.order_item_id,
                oi.product_id,
                oi.quantity,
                oi.unit_price,
                p.code,
                p.name AS product_name
            FROM bar_order_items oi
            INNER JOIN products p
                ON p.product_id = oi.product_id
            WHERE oi.order_id = ?
            ORDER BY oi.order_item_id
            `,
            [orderId]
        );

        if (!items.length) {
            throw serviceError(
                400,
                'An order must contain at least one product before payment.'
            );
        }

        // Validate all quantities before changing inventory.
        for (const item of items) {
            const productId = Number(item.product_id);
            const quantitySold = Number(item.quantity);
            const unitPrice = Number(item.unit_price);

            if (
                !Number.isInteger(productId) ||
                productId <= 0 ||
                !Number.isInteger(quantitySold) ||
                quantitySold <= 0 ||
                !Number.isFinite(unitPrice) ||
                unitPrice < 0
            ) {
                throw serviceError(
                    400,
                    'The order contains an invalid product, quantity or price.'
                );
            }
        }

        // Recalculate the total on the server.
        const calculation = calculateOrderTotals(items);
        const total = money(calculation.total);

        if (!Number.isFinite(total) || total < 0) {
            throw serviceError(
                400,
                'The calculated order total is invalid.'
            );
        }

        let received = null;
        let change = 0;

        if (paymentMethod === 'CASH') {
            received = money(Number(cashReceived));

            if (received < total) {
                throw serviceError(
                    400,
                    'The cash received is less than the order total.'
                );
            }

            change = money(received - total);
        }

        // ========================================================
        // DEDUCT SOLD PRODUCTS FROM THIS SITE'S INVENTORY
        // This runs inside the payment transaction.
        // ========================================================

        for (const item of items) {
            const productId = Number(item.product_id);
            const quantitySold = Number(item.quantity);

            const [inventoryRows] = await connection.query(
                `
                SELECT inventory_id, quantity
                FROM inventory
                WHERE site_id = ?
                  AND product_id = ?
                LIMIT 1
                FOR UPDATE
                `,
                [siteId, productId]
            );

            if (!inventoryRows.length) {
                throw serviceError(
                    409,
                    `Product ${item.code} is not assigned to this site's inventory.`
                );
            }

            const inventory = inventoryRows[0];
            const currentQuantity = Number(inventory.quantity);

            if (
                !Number.isFinite(currentQuantity) ||
                currentQuantity < quantitySold
            ) {
                throw serviceError(
                    409,
                    `Insufficient stock for ${item.product_name}. Available: ${currentQuantity}; required: ${quantitySold}.`
                );
            }

            const [updateResult] = await connection.query(
                `
                UPDATE inventory
                SET quantity = quantity - ?
                WHERE inventory_id = ?
                  AND quantity >= ?
                `,
                [
                    quantitySold,
                    inventory.inventory_id,
                    quantitySold
                ]
            );

            if (updateResult.affectedRows !== 1) {
                throw serviceError(
                    409,
                    `Unable to update inventory for ${item.product_name}.`
                );
            }
        }

        // Register payment.
        const [paymentResult] = await connection.query(
            `
            INSERT INTO order_payments (
                order_id,
                payment_method,
                total_amount,
                cash_received,
                change_amount,
                payment_status,
                processed_by
            )
            VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)
            `,
            [
                orderId,
                paymentMethod,
                total,
                received,
                change,
                actorId
            ]
        );

        const paymentId = paymentResult.insertId;

        // ========================================================
        // GENERATE CONSECUTIVE INTERNAL INVOICE NUMBER
        // The sequence is locked until the transaction finishes.
        // ========================================================

        const [sequenceRows] = await connection.query(
            `
            SELECT next_number
            FROM invoice_sequences
            WHERE site_id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [siteId]
        );

        if (!sequenceRows.length) {
            throw serviceError(
                500,
                'Invoice numbering is not configured for this site.'
            );
        }

        const sequenceNumber = Number(
            sequenceRows[0].next_number
        );

        if (
            !Number.isSafeInteger(sequenceNumber) ||
            sequenceNumber < 1
        ) {
            throw serviceError(
                500,
                'The invoice sequence is invalid.'
            );
        }

        const invoiceNumber =
            `INT-${siteId}-${String(sequenceNumber).padStart(6, '0')}`;

        const [sequenceUpdate] = await connection.query(
            `
            UPDATE invoice_sequences
            SET next_number = next_number + 1
            WHERE site_id = ?
              AND next_number = ?
            `,
            [siteId, sequenceNumber]
        );

        if (sequenceUpdate.affectedRows !== 1) {
            throw serviceError(
                409,
                'Unable to reserve the next invoice number.'
            );
        }

        // Register invoice and buyer information.
                // Consultar los datos del establecimiento que emitirá el comprobante.
        const [siteRows] = await connection.query(
            `
            SELECT
                name,
                address,
                legal_name,
                tax_id,
                tax_regime,
                is_vat_responsible,
                is_consumption_tax_responsible,
                is_vat_withholding_agent,
                printer_name,
                printer_tax_id,
                authorization_number,
                authorization_date,
                authorization_from,
                authorization_to
            FROM sites
            WHERE site_id = ?
            LIMIT 1
            `,
            [siteId]
        );

        if (!siteRows.length) {
            throw serviceError(404, 'No se encontró la sede de la factura.');
        }

        const site = siteRows[0];

        // Registrar el comprobante interno y conservar los datos del vendedor.
        const [invoiceResult] = await connection.query(
            `
            INSERT INTO invoices (
                invoice_number,
                order_id,
                payment_id,
                site_id,
                subtotal,
                total,
                buyer_name,
                buyer_document_type,
                buyer_document,
                tax_amount,
                tax_description,
                payment_form,
                seller_legal_name,
                seller_tax_id,
                seller_address,
                printer_name_snapshot,
                printer_tax_id_snapshot
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                invoiceNumber,
                orderId,
                paymentId,
                siteId,
                total,
                total,
                buyerName,
                buyerDocumentType,
                buyerDocument,
                0,
                'Impuestos no configurados para esta demostración académica',
                paymentMethod === 'CASH' ? 'Contado' : 'Pago electrónico',
                site.legal_name || site.name,
                site.tax_id || 'NIT-DEMO-NO-VALIDO',
                site.address,
                site.printer_name || 'Impresora no configurada',
                site.printer_tax_id || 'NO CONFIGURADO'
            ]
        );

        const invoiceId = invoiceResult.insertId;

        // Save a snapshot of each item for the printed invoice.
        for (const item of items) {
            const quantity = Number(item.quantity);
            const unitPrice = money(item.unit_price);

            await connection.query(
                `
                INSERT INTO invoice_items (
                    invoice_id,
                    product_id,
                    product_code,
                    product_name,
                    quantity,
                    unit_price,
                    line_total
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    invoiceId,
                    item.product_id,
                    item.code,
                    item.product_name,
                    quantity,
                    unitPrice,
                    money(quantity * unitPrice)
                ]
            );
        }

        // Close the order only after payment and invoice creation.
        const [closeResult] = await connection.query(
            `
            UPDATE bar_orders
            SET status = 'CLOSED',
                closed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE order_id = ?
              AND site_id = ?
              AND status = 'OPEN'
            `,
            [orderId, siteId]
        );

        if (closeResult.affectedRows !== 1) {
            throw serviceError(
                409,
                'The order could not be closed.'
            );
        }

        // Release the table.
        await connection.query(
            `
            UPDATE dining_tables
            SET status = 'FREE'
            WHERE table_id = ?
              AND site_id = ?
            `,
            [order.table_id, siteId]
        );

        await connection.commit();

        result = {
            payment_id: paymentId,
            invoice_id: invoiceId,
            invoice_number: invoiceNumber,
            order_id: orderId,
            table_id: order.table_id,
            payment_method: paymentMethod,
            total,
            cash_received: received,
            change_amount: change,
            status: 'COMPLETED'
        };
    } catch (error) {
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error(
                '[BARLOUNGE] Payment rollback failed:',
                rollbackError
            );
        }

        if (error.code === 'ER_DUP_ENTRY') {
            throw serviceError(
                409,
                'This order already has a payment or invoice.'
            );
        }

        throw error;
    } finally {
        connection.release();
    }

    logAuditSafely({
        userId: actorId,
        action: 'PROCESS_PAYMENT',
        entity: 'bar_orders',
        entityId: orderId,
        result: 'SUCCESS'
    });

    return result;
}

// ============================================================
// GET INVOICE AND ITS ITEM SNAPSHOTS
// ============================================================

async function getInvoice(invoiceId, siteId, actorId, isAdmin) {
    const id = validateId(
        invoiceId,
        'Invalid invoice ID.'
    );

    const requestedSiteId = validateId(
        siteId,
        'Invalid site.'
    );

    const [rows] = await pool.query(
        `
        SELECT
            i.invoice_id,
            i.invoice_number,
            i.order_id,
            i.site_id,
            i.subtotal,
            i.total,
            i.issued_at,
            i.buyer_name,
            i.buyer_document_type,
            i.buyer_document,
            i.seller_legal_name AS seller_legal_name_snapshot,
            i.seller_tax_id AS seller_tax_id_snapshot,
            i.seller_address,
            i.printer_name_snapshot,
            i.printer_tax_id_snapshot,
            i.tax_amount,
            i.tax_description,
            i.payment_form,
            s.name AS site_name,
            s.address AS site_address,
            s.legal_name AS seller_legal_name,
            s.tax_id AS seller_tax_id,
            s.tax_regime,
            s.is_vat_responsible,
            s.is_consumption_tax_responsible,
            s.is_vat_withholding_agent,
            s.printer_name,
            s.printer_tax_id,
            s.invoice_prefix,
            s.authorization_number,
            s.authorization_date,
            s.authorization_from,
            s.authorization_to,
            op.payment_id,
            op.payment_method,
            op.cash_received,
            op.change_amount,
            op.payment_status,
            op.created_at AS payment_date,
            u.name AS cashier_name
        FROM invoices i
        INNER JOIN sites s
            ON s.site_id = i.site_id
        INNER JOIN order_payments op
            ON op.payment_id = i.payment_id
        INNER JOIN users u
            ON u.user_id = op.processed_by
        WHERE i.invoice_id = ?
          AND i.site_id = ?
        LIMIT 1
        `,
        [id, requestedSiteId]
    );

    if (!rows.length) {
        throw serviceError(
            404,
            'Invoice not found.'
        );
    }

    const invoice = rows[0];

    const [items] = await pool.query(
        `
        SELECT
            invoice_item_id,
            product_id,
            product_code,
            product_name,
            quantity,
            unit_price,
            line_total
        FROM invoice_items
        WHERE invoice_id = ?
        ORDER BY invoice_item_id
        `,
        [id]
    );

    return {
        ...invoice,
        items
    };
}

module.exports = {
    processPayment,
    getInvoice
};