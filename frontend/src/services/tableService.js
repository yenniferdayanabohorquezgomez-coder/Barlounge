
import api from './api';

// ============================================================
// CONSULTAR MESAS
// ============================================================

export async function getTables(siteId) {
    const response = await api.get('/tables', {
        params: {
            siteId
        }
    });

    return response.data;
}

// ============================================================
// CREAR MESA
// ============================================================

export async function createTable(
    siteId,
    tableNumber
) {
    const response = await api.post('/tables', {
        siteId: Number(siteId),
        tableNumber: String(tableNumber).trim()
    });

    return response.data;
}
