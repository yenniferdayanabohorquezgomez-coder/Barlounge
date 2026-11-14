
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import '../styles/Invoice.css';

// Currency formatting
const formatMoney = (value) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 2
    }).format(Number(value) || 0);

// Date formatting in English
const formatDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
};

// Payment methods translated for display
const paymentLabels = {
    CASH: 'Cash',
    CREDIT_CARD: 'Credit card',
    DEBIT_CARD: 'Debit card'
};

// Document types translated for display
const documentLabels = {
    CC: 'National ID card',
    CE: 'Foreign resident ID',
    NIT: 'Tax identification number (NIT)',
    PASSPORT: 'Passport',
    OTHER: 'Other',

    'Cédula de ciudadanía': 'National ID card',
    'Cédula de extranjería': 'Foreign resident ID',
    'Pasaporte': 'Passport',
    'Otro': 'Other'
};

export default function Invoice() {
    const { invoiceId } = useParams();
    const [searchParams] = useSearchParams();

    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const siteId = searchParams.get('siteId');

    useEffect(() => {
        let active = true;

        async function loadInvoice() {
            setLoading(true);
            setError('');

            try {
                const response = await api.get(
                    `/cash-register/invoices/${invoiceId}`,
                    {
                        params: siteId ? { siteId } : {}
                    }
                );

                if (active) {
                    setInvoice(response.data.invoice);
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.response?.data?.message ||
                        'Unable to load the invoice.'
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadInvoice();

        return () => {
            active = false;
        };
    }, [invoiceId, siteId]);

    if (loading) {
        return (
            <main className="invoice-page">
                <p>Loading invoice...</p>
            </main>
        );
    }

    if (error || !invoice) {
        return (
            <main className="invoice-page">
                <div className="invoice-alert">
                    {error || 'Invoice not found.'}
                </div>

                <button
                    type="button"
                    className="invoice-button no-print"
                    onClick={() => window.history.back()}
                >
                    Back
                </button>
            </main>
        );
    }

    const isCash = invoice.payment_method === 'CASH';

    const items = Array.isArray(invoice.items)
        ? invoice.items
        : [];

    const buyerDocumentType =
        documentLabels[invoice.buyer_document_type] ||
        invoice.buyer_document_type ||
        '—';

    return (
        <main className="invoice-page">

            {/* ACTIONS - NOT PRINTED */}

            <div className="invoice-actions no-print">
                <button
                    type="button"
                    className="invoice-button"
                    onClick={() => window.history.back()}
                >
                    Back
                </button>

                <button
                    type="button"
                    className="invoice-button primary"
                    onClick={() => window.print()}
                >
                    Print invoice
                </button>
            </div>

            {/* PRINTABLE INVOICE */}

            <article className="invoice-paper">

                {/* BUSINESS INFORMATION */}

                <header className="invoice-header">
                    <img
                        src="/barlounge-logo.png"
                        alt="BARLOUNGE logo"
                        className="invoice-logo"
                    />

                    <h1>BARLOUNGE</h1>

                    <p className="invoice-subtitle">
                        INTERNAL SALES RECEIPT
                    </p>

                    <p>
                        <strong>
                            {invoice.seller_legal_name_snapshot ||
                                invoice.seller_legal_name ||
                                invoice.site_name ||
                                'BARLOUNGE'}
                        </strong>
                    </p>

                    <p>
                        Tax ID (NIT):{' '}
                        {invoice.seller_tax_id_snapshot ||
                            invoice.seller_tax_id ||
                            'NIT-DEMO-NO-VALID'}
                    </p>

                    <p>
                        {invoice.seller_address ||
                            invoice.site_address ||
                            'Address not configured'}
                    </p>

                    {invoice.tax_regime && (
                        <p>
                            Tax regime: {invoice.tax_regime}
                        </p>
                    )}

                    <p className="invoice-demo-warning">
                        ACADEMIC DEMONSTRATION DOCUMENT — NOT VALID AS A TAX INVOICE
                    </p>
                </header>

                {/* INVOICE NUMBER */}

                <section className="invoice-number">
                    <div>
                        <span>Internal invoice number</span>
                        <strong>{invoice.invoice_number}</strong>
                    </div>

                    <div>
                        <span>DIAN authorized numbering</span>

                        <strong>
                            {invoice.authorization_number ||
                                'NOT CONFIGURED'}
                        </strong>
                    </div>
                </section>

                {/* TRANSACTION INFORMATION */}

                <section className="invoice-information">
                    <div>
                        <span>Date</span>
                        <strong>
                            {formatDate(invoice.issued_at)}
                        </strong>
                    </div>

                    <div>
                        <span>Order</span>
                        <strong>
                            #{invoice.order_id}
                        </strong>
                    </div>

                    <div>
                        <span>Cashier</span>
                        <strong>
                            {invoice.cashier_name || '—'}
                        </strong>
                    </div>

                    <div>
                        <span>Payment method</span>
                        <strong>
                            {paymentLabels[invoice.payment_method] ||
                                invoice.payment_method ||
                                '—'}
                        </strong>
                    </div>
                </section>

                {/* CUSTOMER INFORMATION */}

                <section className="invoice-customer">
                    <h2>Customer information</h2>

                    <p>
                        <strong>Name or business name:</strong>{' '}
                        {invoice.buyer_name || 'Unidentified consumer'}
                    </p>

                    <p>
                        <strong>Document type:</strong>{' '}
                        {buyerDocumentType}
                    </p>

                    <p>
                        <strong>Document number:</strong>{' '}
                        {invoice.buyer_document || '—'}
                    </p>
                </section>

                {/* PRODUCTS TABLE */}

                <div className="invoice-table-wrapper">
                    <table className="invoice-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Product</th>
                                <th className="number">Quantity</th>
                                <th className="number">Unit price</th>
                                <th className="number">Total</th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map((item) => (
                                <tr key={item.invoice_item_id}>
                                    <td>
                                        {item.product_code || '—'}
                                    </td>

                                    <td>
                                        {item.product_name}
                                    </td>

                                    <td className="number">
                                        {Number(item.quantity)}
                                    </td>

                                    <td className="number">
                                        {formatMoney(item.unit_price)}
                                    </td>

                                    <td className="number">
                                        {formatMoney(item.line_total)}
                                    </td>
                                </tr>
                            ))}

                            {items.length === 0 && (
                                <tr>
                                    <td colSpan={5}>
                                        No products registered.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* TOTALS */}

                <section className="invoice-totals">
                    <div>
                        <span>Subtotal</span>
                        <strong>
                            {formatMoney(invoice.subtotal)}
                        </strong>
                    </div>

                    <div>
                        <span>Taxes</span>
                        <strong>
                            {formatMoney(invoice.tax_amount)}
                        </strong>
                    </div>

                    {invoice.tax_description && (
                        <p className="invoice-legal-note">
                            {invoice.tax_description}
                        </p>
                    )}

                    <div className="invoice-grand-total">
                        <span>Total paid</span>
                        <strong>
                            {formatMoney(invoice.total)}
                        </strong>
                    </div>

                    {isCash && (
                        <>
                            <div>
                                <span>Cash received</span>
                                <strong>
                                    {formatMoney(invoice.cash_received)}
                                </strong>
                            </div>

                            <div>
                                <span>Change returned</span>
                                <strong>
                                    {formatMoney(invoice.change_amount)}
                                </strong>
                            </div>
                        </>
                    )}
                </section>

                {/* FOOTER */}

                <footer className="invoice-footer">
                    <p>
                        Thank you for visiting BARLOUNGE!
                    </p>

                    <p className="invoice-legal-note">
                        Internal sales receipt. This document does not
                        independently certify compliance with tax invoicing
                        requirements.
                    </p>
                </footer>

            </article>
        </main>
    );
}
