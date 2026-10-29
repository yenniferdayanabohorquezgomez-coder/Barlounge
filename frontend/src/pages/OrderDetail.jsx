
import {
    useCallback,
    useEffect,
    useRef,
    useState
} from 'react';

import {
    useNavigate,
    useParams,
    useSearchParams
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

import {
    addOrderItem,
    cancelOrder,
    getOrder,
    getProductAvailability,
    removeOrderItem,
    saveOrder,
    updateOrderItem
} from '../services/orderService';

import { showFlash } from '../utils/flashMessage';

// ============================================================
// HELPERS
// ============================================================

const money = (value) =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
    }).format(Number(value) || 0);

// Keep COP currency formatting used by BARLOUNGE.
const formatMoney = (value) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 2
    }).format(Number(value) || 0);

function getErrorMessage(error, fallback) {
    if (error.code === 'ECONNABORTED') {
        return 'The request timed out. The order will be checked again.';
    }

    return (
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        fallback
    );
}

function normalizeOrderResponse(response) {
    return response?.order || response;
}

function normalizeProductsResponse(response) {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.products)) return response.products;
    if (Array.isArray(response?.data)) return response.data;
    return [];
}

// Recalculate totals immediately after an item changes.
function recalculateOrder(order, items) {
    const normalizedItems = items.map((item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;

        return {
            ...item,
            quantity,
            unit_price: unitPrice,
            line_total: Math.round(
                (quantity * unitPrice + Number.EPSILON) * 100
            ) / 100
        };
    });

    const total = normalizedItems.reduce(
        (sum, item) => sum + item.line_total,
        0
    );

    const totalQuantity = normalizedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    return {
        ...order,
        items: normalizedItems,
        total: Math.round(
            (total + Number.EPSILON) * 100
        ) / 100,
        total_quantity: totalQuantity,
        product_lines: normalizedItems.length
    };
}

// ============================================================
// ORDER DETAIL
// ============================================================

export default function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();

    const siteId =
        searchParams.get('siteId') ||
        String(user?.siteId ?? user?.site_id ?? '');

    const [order, setOrder] = useState(null);
    const [products, setProducts] = useState([]);

    const [quantities, setQuantities] = useState({});
    const [addQuantities, setAddQuantities] = useState({});

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Independent action states: one operation cannot keep
    // another button stuck in its loading state.
    const [addingProductId, setAddingProductId] = useState(null);
    const [updatingItemId, setUpdatingItemId] = useState(null);
    const [removingItemId, setRemovingItemId] = useState(null);
    const [savingOrder, setSavingOrder] = useState(false);
    const [cancellingOrder, setCancellingOrder] = useState(false);
    const productsScrollerRef = useRef(null);
    const [canScrollProductsLeft, setCanScrollProductsLeft] = useState(false);
    const [canScrollProductsRight, setCanScrollProductsRight] = useState(false);

    const updateProductsScrollButtons = useCallback(() => {
        const element = productsScrollerRef.current;
        if (!element) return;

        setCanScrollProductsLeft(element.scrollLeft > 2);
        setCanScrollProductsRight(
            element.scrollLeft + element.clientWidth < element.scrollWidth - 2
        );
    }, []);

    const scrollProducts = (direction) => {
        const element = productsScrollerRef.current;
        if (!element) return;

        element.scrollBy({
            left: direction * element.clientWidth * 0.8,
            behavior: 'smooth'
        });
    };

    const mutationInProgress =
        addingProductId !== null ||
        updatingItemId !== null ||
        removingItemId !== null ||
        savingOrder ||
        cancellingOrder;

    // ========================================================
    // LOAD ORDER AND PRODUCT AVAILABILITY
    // ========================================================

    useEffect(() => {
        const element = productsScrollerRef.current;
        if (!element) return undefined;

        updateProductsScrollButtons();
        element.addEventListener('scroll', updateProductsScrollButtons);

        const resizeObserver = new ResizeObserver(updateProductsScrollButtons);
        resizeObserver.observe(element);

        return () => {
            element.removeEventListener('scroll', updateProductsScrollButtons);
            resizeObserver.disconnect();
        };
    }, [products.length, loading, updateProductsScrollButtons]);

    const loadData = useCallback(async (showLoader = true) => {
        if (!id || !siteId) {
            setError('A valid order and site are required.');
            setLoading(false);
            return;
        }

        if (showLoader) {
            setLoading(true);
            setError('');
        }

        try {
            const [orderResponse, availabilityResponse] =
                await Promise.all([
                    getOrder(id, siteId),
                    getProductAvailability(siteId, id)
                ]);

            const orderData = normalizeOrderResponse(orderResponse);
            const availabilityData =
                normalizeProductsResponse(availabilityResponse);

            if (!orderData || !Array.isArray(orderData.items)) {
                throw new Error(
                    'The server returned an invalid order response.'
                );
            }

            setOrder(orderData);
            setProducts(availabilityData);

            const initialQuantities = {};

            for (const item of orderData.items) {
                initialQuantities[item.order_item_id] =
                    String(item.quantity);
            }

            setQuantities(initialQuantities);
        } catch (e) {
            console.error('Error loading order:', e);

            if (showLoader) {
                setError(
                    getErrorMessage(
                        e,
                        'Unable to load the order.'
                    )
                );
            } else {
                showFlash(
                    'error',
                    'The operation completed, but the latest order data could not be loaded.'
                );
            }
        } finally {
            if (showLoader) {
                setLoading(false);
            }
        }
    }, [id, siteId]);

    useEffect(() => {
        loadData(true);
    }, [loadData]);

    // ========================================================
    // ADD PRODUCT
    // ========================================================

    const handleAddProduct = async (product) => {
        const productId = product.product_id;
        const quantity = Number(
            addQuantities[productId] || 1
        );

        if (mutationInProgress) return;

        if (!Number.isInteger(quantity) || quantity <= 0) {
            setError('Quantity must be a positive whole number.');
            return;
        }

        if (quantity > Number(product.available_to_add)) {
            setError('The requested quantity exceeds available stock.');
            return;
        }

        setAddingProductId(productId);
        setError('');

        let operationSucceeded = false;

        try {
            await addOrderItem(
                id,
                productId,
                quantity,
                siteId
            );

            operationSucceeded = true;

            setAddQuantities((current) => ({
                ...current,
                [productId]: '1'
            }));

            showFlash(
                'success',
                'Product added to the order.'
            );
        } catch (e) {
            console.error('Error adding product:', e);

            setError(
                getErrorMessage(
                    e,
                    'Unable to add the product.'
                )
            );
        } finally {
            // Release this button as soon as the write request settles.
            setAddingProductId(null);
        }

        // Refresh separately; do not hold the button while loading data.
        void loadData(false);

        if (!operationSucceeded) {
            // Reload authoritative server data after a failed/ambiguous request.
            setError((current) =>
                current || 'Check the order before trying this operation again.'
            );
        }
    };

    // ========================================================
    // UPDATE PRODUCT QUANTITY
    // ========================================================

    const handleUpdateQuantity = async (item) => {
        if (mutationInProgress) return;

        const itemId = item.order_item_id;
        const quantity = Number(quantities[itemId]);

        if (!Number.isInteger(quantity) || quantity <= 0) {
            setError('Quantity must be a positive whole number.');
            return;
        }

        const product = products.find(
            (p) =>
                Number(p.product_id) === Number(item.product_id)
        );

        if (product) {
            const maximum =
                Number(product.stock_quantity) -
                Number(product.other_reserved_quantity);

            if (quantity > maximum) {
                setError(
                    `The available maximum for ${item.product_name} is ${Math.max(0, maximum)}.`
                );
                return;
            }
        }

        setUpdatingItemId(itemId);
        setError('');

        try {
            await updateOrderItem(
                id,
                itemId,
                quantity,
                siteId
            );

            // Update the order immediately.
            setOrder((current) => {
                if (!current) return current;

                const updatedItems = current.items.map((line) =>
                    line.order_item_id === itemId
                        ? { ...line, quantity }
                        : line
                );

                return recalculateOrder(current, updatedItems);
            });

            showFlash(
                'success',
                'Product quantity updated.'
            );
        } catch (e) {
            console.error('Error updating quantity:', e);

            setError(
                getErrorMessage(
                    e,
                    'Unable to update the quantity.'
                )
            );

            void loadData(false);
        } finally {
            setUpdatingItemId(null);
        }

        void loadData(false);
    };

    // ========================================================
    // REMOVE PRODUCT
    // ========================================================

    const handleRemoveProduct = async (item) => {
        if (mutationInProgress) return;

        const confirmed = window.confirm(
            `Remove ${item.product_name} from this order?`
        );

        if (!confirmed) return;

        const itemId = item.order_item_id;

        setRemovingItemId(itemId);
        setError('');

        try {
            await removeOrderItem(
                id,
                itemId,
                siteId
            );

            // Remove the line from the current view immediately.
            // No page refresh or second response is needed for this.
            setOrder((current) => {
                if (!current) return current;

                const remainingItems = current.items.filter(
                    (line) => line.order_item_id !== itemId
                );

                return recalculateOrder(
                    current,
                    remainingItems
                );
            });

            setQuantities((current) => {
                const next = { ...current };
                delete next[itemId];
                return next;
            });

            showFlash(
                'success',
                'Product removed from the order.'
            );
        } catch (e) {
            console.error('Error removing product:', e);

            setError(
                getErrorMessage(
                    e,
                    'Unable to remove the product.'
                )
            );
        } finally {
            setRemovingItemId(null);
        }

        // Refresh inventory availability in the background.
        void loadData(false);
    };

    // ========================================================
    // SAVE ORDER WITHOUT CLOSING IT
    // ========================================================

    const handleSaveOrder = async () => {
        if (mutationInProgress) return;

        if (!order?.items?.length) {
            setError('Add at least one product before saving the order.');
            return;
        }

        setSavingOrder(true);
        setError('');

        try {
            await saveOrder(id, siteId);

            showFlash(
                'success',
                'Order saved successfully. It remains open.'
            );

            // Saving does not require waiting for a full data reload.
            void loadData(false);
        } catch (e) {
            console.error('Error saving order:', e);

            setError(
                getErrorMessage(
                    e,
                    'Unable to save the order.'
                )
            );

            // A timeout may happen after the database committed.
            void loadData(false);
        } finally {
            setSavingOrder(false);
        }
    };

    // ========================================================
    // CANCEL EMPTY ORDER
    // ========================================================

    const handleCancelOrder = async () => {
        if (mutationInProgress) return;

        if (order.items.length > 0) {
            setError(
                'Remove all products before cancelling the order.'
            );
            return;
        }

        const confirmed = window.confirm(
            'Cancel this empty order and release the table?'
        );

        if (!confirmed) return;

        setCancellingOrder(true);
        setError('');

        try {
            await cancelOrder(id, siteId);

            showFlash(
                'success',
                'Order cancelled. The table is now free.'
            );

            navigate(`/tables?siteId=${siteId}`);
        } catch (e) {
            console.error('Error cancelling order:', e);

            setError(
                getErrorMessage(
                    e,
                    'Unable to cancel the order.'
                )
            );
        } finally {
            setCancellingOrder(false);
        }
    };

    // ========================================================
    // LOADING AND ERROR STATES
    // ========================================================

    if (loading) {
        return (
            <div className="page">
                <div className="panel">
                    Loading order...
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="page">
                <div className="page-heading">
                    <h1>Order details</h1>

                    <button
                        type="button"
                        className="button ghost"
                        onClick={() =>
                            navigate(`/tables?siteId=${siteId}`)
                        }
                    >
                        Back to tables
                    </button>
                </div>

                <div className="alert error">
                    {error || 'Order not found.'}
                </div>
            </div>
        );
    }

    const isOpen = order.status === 'OPEN';
    const items = order.items || [];

    // ========================================================
    // PAGE
    // ========================================================

    return (
        <div className="page">
            <div className="page-heading">
                <div>
                    <h1>Order #{order.order_id}</h1>

                    <p>
                        Table {order.table_number}
                        {' · '}
                        {order.site}
                    </p>
                </div>

                <button
                    type="button"
                    className="button ghost"
                    onClick={() =>
                        navigate(`/tables?siteId=${siteId}`)
                    }
                >
                    Back to tables
                </button>
            </div>

            {error && (
                <div className="alert error" role="alert">
                    {error}
                </div>
            )}

            {/* ORDER SUMMARY */}

            <div className="panel order-overview">
                <div>
                    <span>Order status</span>

                    <strong
                        className={
                            `table-status ${String(order.status).toLowerCase()}`
                        }
                    >
                        {order.status}
                    </strong>
                </div>

                <div>
                    <span>Waiter</span>
                    <strong>{order.waiter_name}</strong>
                </div>

                <div>
                    <span>Total units</span>
                    <strong>{order.total_quantity || 0}</strong>
                </div>

                <div>
                    <span>Total</span>
                    <strong>{formatMoney(order.total)}</strong>
                </div>
            </div>

            {/* PRODUCTS IN THE ORDER */}

            <section className="panel">
                <h2>Products in the order</h2>

                {items.length === 0 ? (
                    <p>No products have been added to this order.</p>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Product</th>
                                    <th>Unit price</th>
                                    <th>Quantity</th>
                                    <th>Subtotal</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.order_item_id}>
                                        <td>{item.code}</td>
                                        <td>{item.product_name}</td>
                                        <td>{formatMoney(item.unit_price)}</td>

                                        <td>
                                            <input
                                                className="order-quantity-input"
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={
                                                    quantities[item.order_item_id] ??
                                                    String(item.quantity)
                                                }
                                                disabled={
                                                    !isOpen ||
                                                    mutationInProgress
                                                }
                                                onChange={(e) =>
                                                    setQuantities((current) => ({
                                                        ...current,
                                                        [item.order_item_id]:
                                                            e.target.value
                                                    }))
                                                }
                                            />
                                        </td>

                                        <td>{formatMoney(item.line_total)}</td>

                                        <td>
                                            <div className="order-row-actions">
                                                <button
                                                    type="button"
                                                    className="button small"
                                                    disabled={
                                                        !isOpen ||
                                                        mutationInProgress
                                                    }
                                                    onClick={() =>
                                                        handleUpdateQuantity(item)
                                                    }
                                                >
                                                    {updatingItemId === item.order_item_id
                                                        ? 'Updating...'
                                                        : 'Update'}
                                                </button>

                                                <button
                                                    type="button"
                                                    className="button ghost small"
                                                    disabled={
                                                        !isOpen ||
                                                        mutationInProgress
                                                    }
                                                    onClick={() =>
                                                        handleRemoveProduct(item)
                                                    }
                                                >
                                                    {removingItemId === item.order_item_id
                                                        ? 'Removing...'
                                                        : 'Remove'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="order-total">
                    <span>Order total</span>
                    <strong>{formatMoney(order.total)}</strong>
                </div>
            </section>

            {/* AVAILABLE PRODUCTS */}

            <section className="panel">
                <h2>Available products</h2>

                <p className="order-section-description">
                    Availability is calculated for the selected site,
                    including quantities reserved by other open orders.
                </p>

                {products.length === 0 ? (
                    <p>No active products are available.</p>
                ) : (
                    <div className="products-carousel">
                        <button
                            type="button"
                            className="carousel-arrow"
                            onClick={() => scrollProducts(-1)}
                            disabled={!canScrollProductsLeft}
                            aria-label="Productos anteriores"
                            title="Productos anteriores"
                        >
                            ‹
                        </button>

                        <div
                            className="order-products-grid"
                            ref={productsScrollerRef}
                        >
                        {products.map((product) => {
                            const available = Number(
                                product.available_to_add
                            );

                            const adding =
                                addingProductId === product.product_id;

                            return (
                                <article
                                    key={product.product_id}
                                    className="order-product-card"
                                >
                                    <div>
                                        <span className="dining-table-label">
                                            {product.code}
                                        </span>

                                        <h3>{product.name}</h3>

                                        <p>{product.sale_unit}</p>
                                    </div>

                                    <div className="order-product-price">
                                        {formatMoney(product.sale_price)}
                                    </div>

                                    <div className="order-product-stock">
                                        <span>Available to add</span>
                                        <strong>{available}</strong>
                                    </div>

                                    <div className="order-add-controls">
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            max={available}
                                            aria-label={`Quantity for ${product.name}`}
                                            value={
                                                addQuantities[product.product_id] ??
                                                '1'
                                            }
                                            disabled={
                                                !isOpen ||
                                                mutationInProgress ||
                                                available <= 0
                                            }
                                            onChange={(e) =>
                                                setAddQuantities((current) => ({
                                                    ...current,
                                                    [product.product_id]:
                                                        e.target.value
                                                }))
                                            }
                                        />

                                        <button
                                            type="button"
                                            className="button primary"
                                            disabled={
                                                !isOpen ||
                                                mutationInProgress ||
                                                available <= 0
                                            }
                                            onClick={() =>
                                                handleAddProduct(product)
                                            }
                                        >
                                            {adding ? 'Adding...' : 'Add'}
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                        </div>

                        <button
                            type="button"
                            className="carousel-arrow"
                            onClick={() => scrollProducts(1)}
                            disabled={!canScrollProductsRight}
                            aria-label="Siguientes productos"
                            title="Siguientes productos"
                        >
                            ›
                        </button>
                    </div>
                )}
            </section>

            {/* FOOTER ACTIONS */}

            <div className="order-footer-actions">
                <button
                    type="button"
                    className="button primary"
                    disabled={
                        !isOpen ||
                        mutationInProgress ||
                        items.length === 0
                    }
                    onClick={handleSaveOrder}
                >
                    {savingOrder ? 'Saving...' : 'Save open order'}
                </button>

                <button
                    type="button"
                    className="button ghost"
                    disabled={cancellingOrder}
                    onClick={() =>
                        navigate(`/tables?siteId=${siteId}`)
                    }
                >
                    Return to tables
                </button>

                {isOpen && items.length === 0 && (
                    <button
                        type="button"
                        className="button ghost cancel-order"
                        disabled={mutationInProgress}
                        onClick={handleCancelOrder}
                    >
                        {cancellingOrder
                            ? 'Cancelling...'
                            : 'Cancel order and release table'}
                    </button>
                )}
            </div>
        </div>
    );
}
