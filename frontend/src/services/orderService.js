
import api from './api';

const READ_TIMEOUT = 10000;
const WRITE_TIMEOUT = 15000;

// Retrieve open orders.
export async function getOrders(siteId) {
    const response = await api.get('/orders', {
        params: { siteId },
        timeout: READ_TIMEOUT
    });

    return response.data;
}

// Retrieve one order.
export async function getOrder(orderId, siteId) {
    const response = await api.get(`/orders/${orderId}`, {
        params: { siteId },
        timeout: READ_TIMEOUT
    });

    return response.data;
}

// Retrieve product availability at a site.
export async function getProductAvailability(siteId, orderId) {
    const response = await api.get('/orders/availability', {
        params: { siteId, orderId },
        timeout: READ_TIMEOUT
    });

    return response.data;
}

// Create an order for a free table.
export async function createOrder(tableId, siteId) {
    const response = await api.post(
        '/orders',
        { tableId, siteId },
        { timeout: WRITE_TIMEOUT }
    );

    return response.data;
}

// Add a product to an order.
export async function addOrderItem(
    orderId,
    productId,
    quantity,
    siteId
) {
    const response = await api.post(
        `/orders/${orderId}/items`,
        { productId, quantity, siteId },
        { timeout: WRITE_TIMEOUT }
    );

    return response.data;
}

// Update a product quantity.
export async function updateOrderItem(
    orderId,
    itemId,
    quantity,
    siteId
) {
    const response = await api.put(
        `/orders/${orderId}/items/${itemId}`,
        { quantity, siteId },
        { timeout: WRITE_TIMEOUT }
    );

    return response.data;
}

// Remove a product from an order.
export async function removeOrderItem(
    orderId,
    itemId,
    siteId
) {
    const response = await api.delete(
        `/orders/${orderId}/items/${itemId}`,
        {
            data: { siteId },
            timeout: WRITE_TIMEOUT
        }
    );

    return response.data;
}

// Save an order without closing it.
export async function saveOrder(orderId, siteId) {
    const response = await api.post(
        `/orders/${orderId}/save`,
        { siteId },
        { timeout: WRITE_TIMEOUT }
    );

    return response.data;
}

// Cancel an empty order and release the table.
export async function cancelOrder(orderId, siteId) {
    const response = await api.post(
        `/orders/${orderId}/cancel`,
        { siteId },
        { timeout: WRITE_TIMEOUT }
    );

    return response.data;
}
