
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { processPayment } from '../services/cashRegisterService';
import { getOrder, getOrders } from '../services/orderService';
import { getSites } from '../services/siteService';
import '../styles/CashierOrders.css';

const formatMoney = (value) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 2
    }).format(Number(value) || 0);

function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short'
    });
}

function getErrorMessage(error, fallback) {
    if (!error.response) {
        return 'No response received from the server. Check that the backend is running.';
    }

    return error.response.data?.message ||
        error.response.data?.error ||
        error.message ||
        fallback;
}


function normalizeList(response, key) {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.[key])) {
        return response[key];
    }

    if (Array.isArray(response?.data?.[key])) {
        return response.data[key];
    }

    if (Array.isArray(response?.data)) {
        return response.data;
    }

    if (Array.isArray(response?.result?.[key])) {
        return response.result[key];
    }

    return [];
}


export default function CashierOrders() {
    const { user } = useAuth();

    const role = String(
        user?.role || user?.role_name || ''
    ).trim().toLowerCase();

    const isAdmin = [
        'administrador',
        'administrator',
        'admin'
    ].includes(role);

    const assignedSiteId = String(
        user?.siteId ?? user?.site_id ?? ''
    );

    const [sites, setSites] = useState([]);
    const [siteId, setSiteId] = useState(
        isAdmin ? '' : assignedSiteId
    );

    const [orders, setOrders] = useState([]);
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);

    const [loadingSites, setLoadingSites] = useState(isAdmin);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);

    const [refreshVersion, setRefreshVersion] = useState(0);

    const [error, setError] = useState('');
    const [detailError, setDetailError] = useState('');
    const [paymentError, setPaymentError] = useState('');
    const [paymentSuccess, setPaymentSuccess] = useState(null);

    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [cashReceived, setCashReceived] = useState('');
    const [buyerName, setBuyerName] = useState('');
    const [buyerDocumentType, setBuyerDocumentType] = useState('');
    const [buyerDocument, setBuyerDocument] = useState('');


    // Load sites for administrators.
    useEffect(() => {
        if (!isAdmin) {
            setLoadingSites(false);
            setSiteId(assignedSiteId);
            return undefined;
        }

        let active = true;

        setLoadingSites(true);
        setError('');

        getSites()
            .then((response) => {
                if (!active) return;

                const activeSites = normalizeList(
                    response,
                    'sites'
                ).filter(
                    (site) =>
                        String(site.status || '')
                            .trim()
                            .toUpperCase() === 'ACTIVE'
                );

                setSites(activeSites);

                setSiteId((current) => {
                    const exists = activeSites.some(
                        (site) =>
                            String(site.site_id) === String(current)
                    );

                    if (current && exists) return current;

                    return activeSites.length
                        ? String(activeSites[0].site_id)
                        : '';
                });
            })
            .catch((e) => {
                if (active) {
                    setError(
                        getErrorMessage(e, 'Unable to load sites.')
                    );
                }
            })
            .finally(() => {
                if (active) setLoadingSites(false);
            });

        return () => {
            active = false;
        };
    }, [isAdmin, assignedSiteId]);

    // Load open orders.
    // Important: this effect does not clear paymentSuccess.
    // Otherwise the invoice button disappears after refreshing.
    useEffect(() => {
        let active = true;

        setSelectedOrderId('');
        setSelectedOrder(null);
        setDetailError('');
        setPaymentError('');

        if (!siteId) {
            setOrders([]);
            setLoadingOrders(false);
            return () => {
                active = false;
            };
        }

        setLoadingOrders(true);
        setError('');

        getOrders(siteId)
            .then((response) => {
                if (!active) return;

                const loadedOrders = normalizeList(response, 'orders');

                const openOrders = loadedOrders.filter((order) => {
                    const status = String(order.status || '')
                        .trim()
                        .toUpperCase();

                    return status === 'OPEN';
                });

                setOrders(openOrders);
            })
            .catch((e) => {
                if (!active) return;

                setError(
                    getErrorMessage(e, 'No se pudieron cargar los pedidos abiertos.')
                );
            })
            .finally(() => {
                if (active) setLoadingOrders(false);
            });

        return () => {
            active = false;
        };
    }, [siteId, refreshVersion]);

    const selectedSite = sites.find(
        (site) => String(site.site_id) === String(siteId)
    );

    const orderTotal = Number(selectedOrder?.total) || 0;

    const calculatedChange =
        paymentMethod === 'CASH' &&
        cashReceived.trim() !== '' &&
        Number.isFinite(Number(cashReceived))
            ? Math.max(
                0,
                Math.round(
                    (Number(cashReceived) - orderTotal) * 100
                ) / 100
            )
            : 0;

    const handleSiteChange = (event) => {
        setSiteId(event.target.value);
        setPaymentSuccess(null);
        setSelectedOrder(null);
        setSelectedOrderId('');
        setPaymentError('');
        setCashReceived('');
    };

    const handleViewOrder = async (order) => {
        const orderId = String(order.order_id);

        setSelectedOrderId(orderId);
        setSelectedOrder(null);
        setDetailError('');
        setPaymentError('');
        setPaymentSuccess(null);
        setCashReceived('');
        setPaymentMethod('CASH');
        setLoadingDetail(true);

        try {
            const response = await getOrder(orderId, siteId);
            const detail = response?.order || response;

            if (!detail || !Array.isArray(detail.items)) {
                throw new Error(
                    'The server returned an invalid order detail.'
                );
            }

            setSelectedOrder(detail);
        } catch (e) {
            setDetailError(
                getErrorMessage(e, 'Unable to load order detail.')
            );
        } finally {
            setLoadingDetail(false);
        }
    };

    const clearSelectedOrder = () => {
        setSelectedOrderId('');
        setSelectedOrder(null);
        setDetailError('');
        setPaymentError('');
        setCashReceived('');
        setPaymentMethod('CASH');
        setBuyerName('');
        setBuyerDocumentType('');
        setBuyerDocument('');
    };

    const handleProcessPayment = async () => {
        if (!selectedOrder || !selectedOrderId || processingPayment) {
            return;
        }

        if (
            String(selectedOrder.status || '').toUpperCase() !== 'OPEN'
        ) {
            setPaymentError('Only open orders can be paid.');
            return;
        }

        if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
            setPaymentError(
                'The order total must be greater than zero.'
            );
            return;
        }

        if (
            paymentMethod === 'CASH' &&
            (
                cashReceived.trim() === '' ||
                !Number.isFinite(Number(cashReceived)) ||
                Number(cashReceived) < orderTotal
            )
        ) {
            setPaymentError(
                'Enter cash equal to or greater than the order total.'
            );
            return;
        }

        const confirmed = window.confirm(
            `Confirm payment of ${formatMoney(orderTotal)} for order #${selectedOrderId}?`
        );

        if (!confirmed) return;

        setProcessingPayment(true);
        setPaymentError('');

        try {
            const response = await processPayment(
                selectedOrderId,
                siteId,
                paymentMethod,
                paymentMethod === 'CASH'
                    ? Number(cashReceived)
                    : null,
                {
                    buyerName: buyerName.trim(),
                    buyerDocumentType,
                    buyerDocument: buyerDocument.trim()
                }
            );

            const payment = response?.payment || response;

            if (!payment?.invoice_id) {
                throw new Error(
                    'The response did not include an invoice ID. Verify the payment before attempting another charge.'
                );
            }

            // Preserve the payment response while orders refresh.
            setPaymentSuccess({
                ...payment,
                invoice_id: payment.invoice_id,
                total: payment.total ?? orderTotal,
                payment_method: payment.payment_method ?? paymentMethod
            });

            setSelectedOrder(null);
            setSelectedOrderId('');
            setCashReceived('');
            setBuyerName('');
            setBuyerDocumentType('');
            setBuyerDocument('');


            // This reloads the order list but does not erase the success panel.
            setRefreshVersion((value) => value + 1);
        } catch (e) {
            setPaymentError(
                getErrorMessage(
                    e,
                    'Unable to process payment. Verify the order status before trying again.'
                )
            );
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleOpenInvoice = () => {
        if (!paymentSuccess?.invoice_id) {
            setPaymentError(
                'The invoice ID is missing from the payment response.'
            );
            return;
        }

        const query = siteId
            ? `?siteId=${encodeURIComponent(siteId)}`
            : '';

        window.location.href =
            `/invoices/${paymentSuccess.invoice_id}${query}`;
    };

    const totalUnits = (items = []) =>
        items.reduce(
            (sum, item) => sum + (Number(item.quantity) || 0),
            0
        );

    return (
        <main className="page cash-register-page">
            <header className="cash-page-header">
                <div>

                    <h1>Cash Register</h1>
                    <p>
                        Manage open orders, process payments and print physical invoices.
                    </p>
                </div>

                <button
                    type="button"
                    className="cash-button cash-button-secondary"
                    onClick={() => setRefreshVersion((value) => value + 1)}
                    disabled={loadingOrders || loadingSites || !siteId}
                >
                    <span aria-hidden="true">↻</span> Refresh orders
                </button>
            </header>

            <section className="cash-site-card">
                <div className="cash-site-symbol" aria-hidden="true">⌂</div>

                <div className="cash-site-description">
                    <strong>Current site</strong>
                    <span>
                        {isAdmin
                            ? 'Choose the site whose orders you need to manage.'
                            : user?.siteName ||
                              user?.site_name ||
                              'Your assigned site'}
                    </span>
                </div>

                {isAdmin ? (
                    <select
                        aria-label="Select site"
                        value={siteId}
                        onChange={handleSiteChange}
                        disabled={loadingSites || sites.length === 0}
                    >
                        <option value="">Select a site</option>
                        {sites.map((site) => (
                            <option
                                key={site.site_id}
                                value={String(site.site_id)}
                            >
                                {site.name}
                            </option>
                        ))}
                    </select>
                ) : (
                    <span className="cash-site-name">
                        {user?.siteName || user?.site_name || 'Assigned site'}
                    </span>
                )}
            </section>

            {error && (
                <div className="cash-alert cash-alert-error" role="alert">
                    {error}
                </div>
            )}

            {loadingSites && (
                <div className="cash-empty-state">Loading sites...</div>
            )}

            {!loadingSites && isAdmin && sites.length === 0 && (
                <div className="cash-empty-state">
                    No active sites are available.
                </div>
            )}

            {siteId && (
                <section className="cash-section">
                    <div className="cash-section-heading">
                        <div>
                            <h2>Open orders</h2>
                            <p>
                                {selectedSite?.name ||
                                    user?.siteName ||
                                    user?.site_name ||
                                    'Selected site'}
                            </p>
                        </div>

                        <span className="cash-count">
                            {loadingOrders ? 'Loading...' : `${orders.length} abierto${orders.length === 1 ? '' : 's'}`}
                        </span>
                    </div>

                    {loadingOrders ? (
                        <div className="cash-empty-state">
                            Loading open orders...
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="cash-empty-state">
                            <span className="cash-empty-icon" aria-hidden="true">▤</span>
                            <strong>No open orders</strong>
                            <p>There are currently no orders awaiting payment at this site.</p>
                        </div>
                    ) : (
                        <div className="cash-table-wrap">
                            <table className="cash-table">
                                <thead>
                                    <tr>
                                        <th>Order</th>
                                        <th>Table</th>
                                        <th>Waiter</th>
                                        <th>Opened</th>
                                        <th>Products</th>
                                        <th>Units</th>
                                        <th>Total</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => (
                                        <tr key={order.order_id}>
                                            <td>
                                                <strong>#{order.order_id}</strong>
                                            </td>
                                            <td>{order.table_number || order.table_id}</td>
                                            <td>{order.waiter_name || '—'}</td>
                                            <td>{formatDate(order.opened_at)}</td>
                                            <td>{Number(order.product_lines) || 0}</td>
                                            <td>{Number(order.total_quantity) || 0}</td>
                                            <td className="cash-table-total">
                                                {formatMoney(order.total)}
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="cash-button cash-button-small"
                                                    onClick={() => handleViewOrder(order)}
                                                    disabled={loadingDetail}
                                                >
                                                    {loadingDetail &&
                                                    selectedOrderId === String(order.order_id)
                                                        ? 'Loading...'
                                                        : 'Review order'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {selectedOrderId && (
                <section className="cash-section cash-order-detail">
                    <header className="cash-section-heading">
                        <div>
                            <span className="cash-eyebrow">ORDER REVIEW</span>
                            <h2>Order #{selectedOrderId}</h2>
                            <p>Review the products and total before accepting payment.</p>
                        </div>

                        <button
                            type="button"
                            className="cash-button cash-button-secondary"
                            onClick={clearSelectedOrder}
                            disabled={processingPayment}
                        >
                            Back to orders
                        </button>
                    </header>

                    {loadingDetail && (
                        <div className="cash-empty-state">
                            Loading order details...
                        </div>
                    )}

                    {detailError && (
                        <div className="cash-alert cash-alert-error" role="alert">
                            {detailError}
                        </div>
                    )}

                    {!loadingDetail && selectedOrder && (
                        <>
                            <div className="cash-order-metadata">
                                <div>
                                    <span>Table</span>
                                    <strong>
                                        {selectedOrder.table_number ||
                                            selectedOrder.table_id}
                                    </strong>
                                </div>
                                <div>
                                    <span>Waiter</span>
                                    <strong>{selectedOrder.waiter_name || '—'}</strong>
                                </div>
                                <div>
                                    <span>Status</span>
                                    <strong className="cash-status-open">
                                        {selectedOrder.status}
                                    </strong>
                                </div>
                                <div>
                                    <span>Total units</span>
                                    <strong>{totalUnits(selectedOrder.items)}</strong>
                                </div>
                            </div>

                            <div className="cash-table-wrap">
                                <table className="cash-table">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Product</th>
                                            <th>Quantity</th>
                                            <th>Unit price</th>
                                            <th>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedOrder.items.length === 0 ? (
                                            <tr>
                                                <td colSpan="5">
                                                    This order has no products.
                                                </td>
                                            </tr>
                                        ) : (
                                            selectedOrder.items.map((item, index) => (
                                                <tr
                                                    key={
                                                        item.order_item_id ||
                                                        `${item.product_id}-${index}`
                                                    }
                                                >
                                                    <td>{item.code || '—'}</td>
                                                    <td>{item.product_name || item.name || '—'}</td>
                                                    <td>{Number(item.quantity) || 0}</td>
                                                    <td>{formatMoney(item.unit_price)}</td>
                                                    <td>
                                                        {formatMoney(
                                                            item.line_total ??
                                                            Number(item.quantity) *
                                                            Number(item.unit_price)
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="cash-order-total">
                                <span>Amount due</span>
                                <strong>{formatMoney(orderTotal)}</strong>
                            </div>

                            {String(selectedOrder.status || '').toUpperCase() === 'OPEN' &&
                                selectedOrder.items.length > 0 && (
                                    <section className="cash-payment-panel">
                                        <div className="cash-payment-heading">
                                            <div className="cash-payment-icon" aria-hidden="true">
                                                $
                                            </div>
                                            <div>
                                                <h2>Payment details</h2>
                                                <p>
                                                    Confirm the payment method and the amount received.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="cash-payment-summary">
                                            <div>
                                                <span>Order total</span>
                                                <strong>{formatMoney(orderTotal)}</strong>
                                            </div>
                                            <span className="cash-payment-summary-note">
                                                Order #{selectedOrderId}
                                            </span>
                                        </div>
                                        
                                        <section className="cash-buyer-fields">
                                            <h3>Buyer information</h3>
                                            <p>
                                                Enter the buyer's information when applicable.
                                            </p>

                                            <div className="cash-form-group">
                                                <label htmlFor="buyerName">
                                                    Name or business name
                                                </label>
                                                <input
                                                    id="buyerName"
                                                    type="text"
                                                    maxLength={180}
                                                    value={buyerName}
                                                    onChange={(event) => setBuyerName(event.target.value)}
                                                    disabled={processingPayment}
                                                    placeholder="Enter buyer name"
                                                />
                                            </div>

                                            <div className="cash-form-group">
                                                <label htmlFor="buyerDocumentType">
                                                    Document type
                                                </label>
                                                <select
                                                    id="buyerDocumentType"
                                                    value={buyerDocumentType}
                                                    onChange={(event) =>
                                                        setBuyerDocumentType(event.target.value)
                                                    }
                                                    disabled={processingPayment}
                                                >
                                                    <option value="">Select document type</option>
                                                    <option value="CC">Cédula de ciudadanía</option>
                                                    <option value="CE">Cédula de extranjería</option>
                                                    <option value="NIT">NIT</option>
                                                    <option value="PASSPORT">Pasaporte</option>
                                                    <option value="OTHER">Otro</option>
                                                </select>
                                            </div>

                                            <div className="cash-form-group">
                                                <label htmlFor="buyerDocument">
                                                    Document number
                                                </label>
                                                <input
                                                    id="buyerDocument"
                                                    type="text"
                                                    maxLength={40}
                                                    value={buyerDocument}
                                                    onChange={(event) =>
                                                        setBuyerDocument(event.target.value)
                                                    }
                                                    disabled={processingPayment}
                                                    placeholder="Enter document number"
                                                />
                                            </div>
                                        </section>

                                        <div className="cash-payment-fields">
                                            <div className="cash-form-group">
                                                <label htmlFor="paymentMethod">
                                                    Payment method
                                                </label>
                                                <select
                                                    id="paymentMethod"
                                                    value={paymentMethod}
                                                    onChange={(event) => {
                                                        setPaymentMethod(event.target.value);
                                                        setPaymentError('');
                                                    }}
                                                    disabled={processingPayment}
                                                >
                                                    <option value="CASH">Cash</option>
                                                    <option value="CREDIT_CARD">Credit card</option>
                                                    <option value="DEBIT_CARD">Debit card</option>
                                                </select>
                                            </div>

                                            {paymentMethod === 'CASH' && (
                                                <div className="cash-form-group">
                                                    <label htmlFor="cashReceived">
                                                        Cash received (COP)
                                                    </label>
                                                    <input
                                                        id="cashReceived"
                                                        type="number"
                                                        min={orderTotal}
                                                        step="0.01"
                                                        value={cashReceived}
                                                        onChange={(event) => {
                                                            setCashReceived(event.target.value);
                                                            setPaymentError('');
                                                        }}
                                                        disabled={processingPayment}
                                                        placeholder="Enter amount received"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {paymentMethod === 'CASH' && (
                                            <div className="cash-change">
                                                <div>
                                                    <span>Change to return</span>
                                                    <small>
                                                        {Number(cashReceived) < orderTotal
                                                            ? 'Enter enough cash to cover the total.'
                                                            : 'Amount to return to the customer.'}
                                                    </small>
                                                </div>
                                                <strong>{formatMoney(calculatedChange)}</strong>
                                            </div>
                                        )}

                                        {paymentError && (
                                            <div className="cash-alert cash-alert-error" role="alert">
                                                {paymentError}
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            className="cash-button cash-button-pay"
                                            onClick={handleProcessPayment}
                                            disabled={processingPayment || loadingDetail}
                                        >
                                            {processingPayment
                                                ? 'Processing payment...'
                                                : 'Confirm payment and close order'}
                                        </button>

                                        <p className="cash-payment-footnote">
                                            Confirming payment closes the order and releases the table.
                                        </p>
                                    </section>
                                )}

                            {String(selectedOrder.status || '').toUpperCase() !== 'OPEN' && (
                                <div className="cash-alert cash-alert-error">
                                    This order is no longer open and cannot be paid here.
                                </div>
                            )}
                        </>
                    )}
                </section>
            )}

            {paymentSuccess && (
                <section className="cash-success-panel" role="status" aria-live="polite">
                    <div className="cash-success-header">
                        <div className="cash-success-check" aria-hidden="true">✓</div>
                        <div>
                            <h2>Payment completed</h2>
                            <p>The order has been closed. Your physical invoice is ready.</p>
                        </div>
                    </div>

                    <div className="cash-success-details">
                        <div>
                            <span>Invoice number</span>
                            <strong>{paymentSuccess.invoice_number || '—'}</strong>
                        </div>
                        <div>
                            <span>Total paid</span>
                            <strong>
                                {formatMoney(
                                    paymentSuccess.total ??
                                    paymentSuccess.total_amount
                                )}
                            </strong>
                        </div>
                        <div>
                            <span>Payment method</span>
                            <strong>
                                {{
                                    CASH: 'Cash',
                                    CREDIT_CARD: 'Credit card',
                                    DEBIT_CARD: 'Debit card'
                                }[paymentSuccess.payment_method] ||
                                    paymentSuccess.payment_method ||
                                    '—'}
                            </strong>
                        </div>

                        {paymentSuccess.payment_method === 'CASH' && (
                            <div>
                                <span>Change returned</span>
                                <strong>
                                    {formatMoney(paymentSuccess.change_amount)}
                                </strong>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        className="cash-button cash-button-invoice"
                        onClick={handleOpenInvoice}
                    >
                        Open invoice <span aria-hidden="true">↗</span>
                    </button>
                </section>
            )}
        </main>
    );
}
