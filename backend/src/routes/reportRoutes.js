const router = require('express').Router();

const controller = require('../controllers/reportController');

const {
    requireAuth
} = require('../middleware/authMiddleware');

const {
    requirePermission
} = require('../middleware/permissionMiddleware');

router.use(requireAuth);

router.get(
    '/sales',
    requirePermission('REPORTS_READ'),
    controller.sales
);

router.get(
    '/top-products',
    requirePermission('REPORTS_READ'),
    controller.topProducts
);

router.get(
    '/inventory',
    requirePermission('REPORTS_READ'),
    controller.inventory
);

module.exports = router;