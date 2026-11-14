import api from './api';

export const getSalesReport = (filters) =>
    api.get('/reports/sales', {
        params: filters
    }).then(response => response.data);

export const getInventoryReport = (filters = {}) =>
    api.get('/reports/inventory', {
        params: filters
    }).then(response => response.data);

export const getTopProductsReport = (filters) =>
    api.get('/reports/top-products', {
        params: filters
    }).then(response => response.data);