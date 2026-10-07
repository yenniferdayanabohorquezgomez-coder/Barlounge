import api from './api';

export const getProducts = () => api.get('/products').then(r => r.data);
export const getProduct = id => api.get(`/products/${id}`).then(r => r.data);
export const createProduct = p => api.post('/products', p).then(r => r.data);
export const updateProduct = (id, p) => api.put(`/products/${id}`, p).then(r => r.data);