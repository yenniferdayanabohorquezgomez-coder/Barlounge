const router = require('express').Router();
const c = require('../controllers/productTypeController');
const {
    requireAuth
} = require('../middleware/authMiddleware');
const {
    requirePermission
} = require('../middleware/permissionMiddleware');

router.use(requireAuth);
router.get('/', requirePermission('PRODUCT_TYPES_READ'), c.list);
router.get('/:id', requirePermission('PRODUCT_TYPES_READ'), c.getById);
router.post('/', requirePermission('PRODUCT_TYPES_CREATE'), c.create);
router.put('/:id', requirePermission('PRODUCT_TYPES_UPDATE'), c.update);

module.exports = router;