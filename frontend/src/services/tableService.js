
import api from './api';

// Consultar mesas de una sede
export async function getTables(siteId) {
    const response = await api.get('/tables', {
        params: { siteId }
    });

    return response.data;
}

// Crear una mesa
export async function createTable(siteId, tableNumber) {
    const response = await api.post('/tables', {
        siteId,
        tableNumber
    });

    return response.data;
}
