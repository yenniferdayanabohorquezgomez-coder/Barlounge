
const router = require('express').Router();

const controller = require('../controllers/securityController');

const {
    requireAuth
} = require('../middleware/authMiddleware');

const {
    requirePermission
} = require('../middleware/permissionMiddleware');

// All security routes require authentication.
router.use(requireAuth);

// Only users with SECURITY_READ can view the overview.
router.get(
    '/overview',
    requirePermission('SECURITY_READ'),
    controller.overview
);

module.exports = router;