import api from './api';

export const getInventory = siteId => api.get('/inventory', {
    params: siteId ? {
        siteId
    } : undefined
}).then(r => r.data);
export const incrementInventory = (id, amount, siteId) => api.patch(`/inventory/${id}/increment`, {
    amount,
    siteId
}).then(r => r.data);