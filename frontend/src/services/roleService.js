import api from './api';

export const getRoles = () => api.get('/roles').then(r => r.data);