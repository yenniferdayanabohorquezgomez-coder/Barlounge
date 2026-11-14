require('dotenv').config();

const pool = require('../config/db');

const {
    encryptSensitiveText
} = require('../utils/fieldEncryption');

async function migrateExistingInvoices() {
    const connection = await pool.getConnection();

    let migrated = 0;

    try {
        await connection.beginTransaction();

        const [invoices] = await connection.query(
            `
            SELECT
                invoice_id,
                buyer_name,
                buyer_document,
                buyer_name_encrypted,
                buyer_document_encrypted
            FROM invoices
            WHERE
                buyer_name IS NOT NULL
                OR buyer_document IS NOT NULL
            FOR UPDATE
            `
        );

        for (const invoice of invoices) {
            const encryptedName =
                invoice.buyer_name_encrypted ||
                encryptSensitiveText(invoice.buyer_name);

            const encryptedDocument =
                invoice.buyer_document_encrypted ||
                encryptSensitiveText(invoice.buyer_document);

            await connection.query(
                `
                UPDATE invoices
                SET
                    buyer_name = NULL,
                    buyer_document = NULL,
                    buyer_name_encrypted = ?,
                    buyer_document_encrypted = ?
                WHERE invoice_id = ?
                `,
                [
                    encryptedName,
                    encryptedDocument,
                    invoice.invoice_id
                ]
            );

            migrated++;
        }

        await connection.commit();

        console.log(
            `Invoice encryption migration completed. Records processed: ${migrated}`
        );

    } catch (error) {
        await connection.rollback();

        console.error(
            'Invoice encryption migration failed:',
            error.message
        );

        throw error;

    } finally {
        connection.release();
        await pool.end();
    }
}

migrateExistingInvoices().catch(() => {
    process.exitCode = 1;
});