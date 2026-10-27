import api from './api';

// Retrieve the tables for the selected site.
export async function getTables(siteId) {
    const response = await api.get('/tables', {
        params: { siteId }
    });

    return response.data;
}