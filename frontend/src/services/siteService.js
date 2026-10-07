import api from './api';

export const getSites = () => api.get('/sites').then(r => r.data);
export const getSite = id => api.get(`/sites/${id}`).then(r => r.data);
export const createSite = p => api.post('/sites', p).then(r => r.data);
export const updateSite = (id, p) => api.put(`/sites/${id}`, p).then(r => r.data);