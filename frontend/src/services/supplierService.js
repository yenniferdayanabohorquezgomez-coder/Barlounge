import api from './api';

export const getSuppliers = () => api.get('/suppliers').then(r => r.data);
export const getSupplier = id => api.get(`/suppliers/${id}`).then(r => r.data);
export const createSupplier = p => api.post('/suppliers', p).then(r => r.data);
export const updateSupplier = (id, p) => api.put(`/suppliers/${id}`, p).then(r => r.data);