const router = require('express').Router();
const c = require('../controllers/dashboardController');
const {
    requireAuth
} = require('../middleware/authMiddleware');
const {
    requirePermission
} = require('../middleware/permissionMiddleware');

router.get('/', requireAuth, requirePermission('DASHBOARD_READ'), c.summary);

module.exports = router;