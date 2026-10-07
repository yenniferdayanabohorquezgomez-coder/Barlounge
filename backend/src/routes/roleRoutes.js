const router = require('express').Router();
const c = require('../controllers/roleController');
const {
    requireAuth
} = require('../middleware/authMiddleware');
const {
    requirePermission
} = require('../middleware/permissionMiddleware');

router.get('/', requireAuth, requirePermission('USERS_READ'), c.list);

module.exports = router;