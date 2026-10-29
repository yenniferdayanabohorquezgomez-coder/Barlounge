import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import '../styles/Invoice.css';

const formatMoney = (value) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 2
    }).format(Number(value) || 0);

const formatDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
};

const paymentLabels = {
    CASH: 'Efectivo',
    CREDIT_CARD: 'Tarjeta de crédito',
    DEBIT_CARD: 'Tarjeta débito'
};

const documentLabels = {
    CC: 'Cédula de ciudadanía',
    CE: 'Cédula de extranjería',
    NIT: 'NIT',
    PASSPORT: 'Pasaporte',
    OTHER: 'Otro'
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
                        'No fue posible cargar la factura.'
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
                <p>Cargando factura...</p>
            </main>
        );
    }

    if (error || !invoice) {
        return (
            <main className="invoice-page">
                <div className="invoice-alert">
                    {error || 'No se encontró la factura.'}
                </div>

                <button
                    type="button"
                    className="invoice-button no-print"
                    onClick={() => window.history.back()}
                >
                    Volver
                </button>
            </main>
        );
    }

    const isCash = invoice.payment_method === 'CASH';
    const items = Array.isArray(invoice.items) ? invoice.items : [];

    return (
        <main className="invoice-page">
            <div className="invoice-actions no-print">
                <button
                    type="button"
                    className="invoice-button"
                    onClick={() => window.history.back()}
                >
                    Volver
                </button>

                <button
                    type="button"
                    className="invoice-button primary"
                    onClick={() => window.print()}
                >
                    Imprimir factura
                </button>
            </div>

            <article className="invoice-paper">
                <header className="invoice-header">
                    <img
                        src="/barlounge-logo.png"
                        alt="Logo de BARLOUNGE"
                        className="invoice-logo"
                    />

                    <h1>BARLOUNGE</h1>

                    <p className="invoice-subtitle">
                        COMPROBANTE INTERNO DE VENTA
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
                        NIT: {invoice.seller_tax_id_snapshot ||
                            invoice.seller_tax_id ||
                            'NIT-DEMO-NO-VALIDO'}
                    </p>

                    <p>{invoice.seller_address || invoice.site_address || 'Dirección no configurada'}</p>

                    {invoice.tax_regime && (
                        <p>Régimen tributario: {invoice.tax_regime}</p>
                    )}

                    <p className="invoice-demo-warning">
                        DOCUMENTO DE DEMOSTRACIÓN ACADÉMICA — NO VÁLIDO COMO FACTURA FISCAL
                    </p>
                </header>

                <section className="invoice-number">
                    <div>
                        <span>Número interno</span>
                        <strong>{invoice.invoice_number}</strong>
                    </div>

                    <div>
                        <span>Numeración autorizada por la DIAN</span>
                        <strong>
                            {invoice.authorization_number || 'NO CONFIGURADA'}
                        </strong>
                    </div>
                </section>

                <section className="invoice-information">
                    <div>
                        <span>Fecha</span>
                        <strong>{formatDate(invoice.issued_at)}</strong>
                    </div>

                    <div>
                        <span>Cuenta</span>
                        <strong>#{invoice.order_id}</strong>
                    </div>

                    <div>
                        <span>Cajero</span>
                        <strong>{invoice.cashier_name || '—'}</strong>
                    </div>

                    <div>
                        <span>Medio de pago</span>
                        <strong>
                            {paymentLabels[invoice.payment_method] ||
                                invoice.payment_method ||
                                '—'}
                        </strong>
                    </div>
                </section>

                <section className="invoice-customer">
                    <h2>Datos del comprador</h2>

                    <p>
                        <strong>Nombre o razón social:</strong>{' '}
                        {invoice.buyer_name || 'Consumidor no identificado'}
                    </p>

                    <p>
                        <strong>Tipo de documento:</strong>{' '}
                        {documentLabels[invoice.buyer_document_type] ||
                            invoice.buyer_document_type ||
                            '—'}
                    </p>

                    <p>
                        <strong>Número de documento:</strong>{' '}
                        {invoice.buyer_document || '—'}
                    </p>
                </section>

                <div className="invoice-table-wrapper">
                    <table className="invoice-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Producto</th>
                                <th className="number">Cant.</th>
                                <th className="number">Valor unitario</th>
                                <th className="number">Total</th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map((item) => (
                                <tr key={item.invoice_item_id}>
                                    <td>{item.product_code || '—'}</td>
                                    <td>{item.product_name}</td>
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
                                        No hay productos registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <section className="invoice-totals">
                    <div>
                        <span>Subtotal</span>
                        <strong>{formatMoney(invoice.subtotal)}</strong>
                    </div>

                    <div>
                        <span>Impuestos</span>
                        <strong>{formatMoney(invoice.tax_amount)}</strong>
                    </div>

                    {invoice.tax_description && (
                        <p className="invoice-legal-note">
                            {invoice.tax_description}
                        </p>
                    )}

                    <div className="invoice-grand-total">
                        <span>Total pagado</span>
                        <strong>{formatMoney(invoice.total)}</strong>
                    </div>

                    {isCash && (
                        <>
                            <div>
                                <span>Efectivo recibido</span>
                                <strong>
                                    {formatMoney(invoice.cash_received)}
                                </strong>
                            </div>

                            <div>
                                <span>Cambio entregado</span>
                                <strong>
                                    {formatMoney(invoice.change_amount)}
                                </strong>
                            </div>
                        </>
                    )}
                </section>

                <footer className="invoice-footer">
                    <p>Gracias por visitar BARLOUNGE.</p>

                    <p className="invoice-legal-note">
                        Comprobante interno de venta. Este documento no
                        acredita por sí solo el cumplimiento de las
                        obligaciones de facturación tributaria.
                    </p>
                </footer>
            </article>
        </main>
    );
}