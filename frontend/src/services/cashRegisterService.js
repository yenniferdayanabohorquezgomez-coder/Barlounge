import api from './api';

const WRITE_TIMEOUT = 15000;

export async function processPayment(
    orderId,
    siteId,
    paymentMethod,
    cashReceived,
    buyer = {}
) {
    const response = await api.post(
        `/cash-register/orders/${orderId}/pay`,
        {
            siteId,
            paymentMethod,
            cashReceived,
            buyerName: buyer.buyerName?.trim() || null,
            buyerDocumentType: buyer.buyerDocumentType || null,
            buyerDocument: buyer.buyerDocument?.trim() || null
        },
        {
            timeout: WRITE_TIMEOUT
        }
    );

    return response.data;
}