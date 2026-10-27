import api from './api';

export const getInventory = (siteId) =>
    api.get('/inventory', {
        params: siteId ? { siteId } : undefined
    }).then((response) => response.data);

export const incrementInventory = (
    id,
    amount,
    siteId
) =>
    api.patch(`/inventory/${id}/increment`, {
        amount,
        siteId
    }).then((response) => response.data);

// ============================================================
// PRODUCT ASSIGNMENT
// ============================================================
// Get products already assigned to a site.
export const getProductAssignments = (siteId) =>
    api.get('/inventory/assignments', {
        params: { siteId }
    }).then((response) => response.data);

// Get active catalog products not assigned to a site.
export const getAssignableProducts = (siteId) =>
    api.get('/inventory/assignable-products', {
        params: { siteId }
    }).then((response) => response.data);

// Assign a product to a site.
// The initial inventory quantity is zero.
export const assignProduct = (
    siteId,
    productId
) =>
    api.post('/inventory/assignments', {
        siteId,
        productId
    }).then((response) => response.data);

// Remove an eligible product assignment.
export const unassignProduct = (
    inventoryId,
    siteId
) =>
    api.delete(`/inventory/assignments/${inventoryId}`, {
        params: { siteId }
    }).then((response) => response.data);
