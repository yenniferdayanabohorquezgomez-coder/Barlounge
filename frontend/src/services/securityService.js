import api from './api';

// Retrieve the security controls and active session overview.
export const getSecurityOverview = () =>
    api
        .get('/security/overview')
        .then(response => response.data);
