const service = require('../services/cashRegisterService');

function handle(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

function controllerError(status, message) {
    const error = new Error(message);
    error.status = status;
    error.publicMessage = message;
    return error;
}

function getSiteId(req) {
    const role = String(req.user.role_name || '')
        .trim()
        .toLowerCase();

    if (['administrador', 'administrator', 'admin'].includes(role)) {
        const siteId = Number(req.body.siteId);

        if (!Number.isInteger(siteId) || siteId <= 0) {
            throw controllerError(400, 'Selecciona una sede válida.');
        }

        return siteId;
    }

    const siteId = Number(req.user.site_id);

    if (!Number.isInteger(siteId) || siteId <= 0) {
        throw controllerError(400, 'Tu sede asignada no es válida.');
    }

    return siteId;
}

const processPayment = handle(async (req, res) => {
    const siteId = getSiteId(req);

    const {
        paymentMethod,
        cashReceived,
        buyerName,
        buyerDocumentType,
        buyerDocument
    } = req.body;

    const buyer = {
        buyerName,
        buyerDocumentType,
        buyerDocument
    };

    const payment = await service.processPayment(
        req.params.orderId,
        siteId,
        req.user.user_id,
        paymentMethod,
        cashReceived,
        buyer
    );

    return res.status(201).json({
        message: 'Pago procesado correctamente.',
        payment
    });
});

const getInvoice = handle(async (req, res) => {
    const role = String(req.user.role_name || '')
        .trim()
        .toLowerCase();

    const isAdmin = [
        'administrador',
        'administrator',
        'admin'
    ].includes(role);

    const siteId = isAdmin
        ? Number(req.query.siteId)
        : Number(req.user.site_id);

    if (!Number.isInteger(siteId) || siteId <= 0) {
        return res.status(400).json({
            message: 'Selecciona una sede válida.'
        });
    }

    const invoice = await service.getInvoice(
        req.params.invoiceId,
        siteId,
        req.user.user_id,
        isAdmin
    );

    return res.status(200).json({ invoice });
});

module.exports = {
    processPayment,
    getInvoice
};