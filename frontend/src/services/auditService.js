import api from './api';

export const getAuditLogs = async (filters = {}) => {
    try {
        const response = await api.get('/audit', {
            params: filters,
            timeout: 15000
        });

        return response.data;

    } catch (error) {
        console.error(
            'AUDIT API ERROR:',
            error.response?.data || error.message
        );

        throw error;
    }
};