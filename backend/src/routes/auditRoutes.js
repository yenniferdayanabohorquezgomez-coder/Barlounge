const router = require('express').Router();

const controller = require('../controllers/auditController');

const {
    requireAuth
} = require('../middleware/authMiddleware');

const {
    requirePermission
} = require('../middleware/permissionMiddleware');

router.use(requireAuth);

router.get(
    '/',
    requirePermission('AUDIT_READ'),
    controller.list
);

module.exports = router;