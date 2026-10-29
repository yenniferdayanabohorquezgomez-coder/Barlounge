const router = require('express').Router();

const controller = require('../controllers/cashRegisterController');

const {
    requireAuth
} = require('../middleware/authMiddleware');

const {
    requirePermission
} = require('../middleware/permissionMiddleware');

router.use(requireAuth);

router.post(
    '/orders/:orderId/pay',
    requirePermission('PAYMENTS_CREATE'),
    controller.processPayment
);

router.get(
    '/invoices/:invoiceId',
    requirePermission('INVOICES_READ'),
    controller.getInvoice
);

module.exports = router;