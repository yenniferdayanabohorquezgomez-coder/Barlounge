const router = require('express').Router();
const c = require('../controllers/userController');
const {
    requireAuth
} = require('../middleware/authMiddleware');
const {
    requirePermission
} = require('../middleware/permissionMiddleware');

router.use(requireAuth);
router.get('/', requirePermission('USERS_READ'), c.list);
router.get('/:id', requirePermission('USERS_READ'), c.getById);
router.post('/', requirePermission('USERS_CREATE'), c.create);
router.put('/:id', requirePermission('USERS_UPDATE'), c.update);

module.exports = router;