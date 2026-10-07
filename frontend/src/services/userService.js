import api from './api';

export const getUsers = () => api.get('/users').then(r => r.data);
export const getUser = id => api.get(`/users/${id}`).then(r => r.data);
export const createUser = p => api.post('/users', p).then(r => r.data);
export const updateUser = (id, p) => api.put(`/users/${id}`, p).then(r => r.data);