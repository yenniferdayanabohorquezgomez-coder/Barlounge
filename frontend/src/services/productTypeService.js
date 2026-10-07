import api from './api';

export const getProductTypes = () => api.get('/product-types').then(r => r.data);
export const getProductType = id => api.get(`/product-types/${id}`).then(r => r.data);
export const createProductType = p => api.post('/product-types', p).then(r => r.data);
export const updateProductType = (id, p) => api.put(`/product-types/${id}`, p).then(r => r.data);
