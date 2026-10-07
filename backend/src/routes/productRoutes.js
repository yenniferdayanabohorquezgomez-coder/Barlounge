const router = require('express').Router();
const c = require('../controllers/productController');
const {
    requireAuth
} = require('../middleware/authMiddleware');
const {
    requirePermission
} = require('../middleware/permissionMiddleware');

router.use(requireAuth);
router.get('/', requirePermission('PRODUCTS_READ'), c.list);
router.get('/:id', requirePermission('PRODUCTS_READ'), c.getById);
router.post('/', requirePermission('PRODUCTS_CREATE'), c.create);
router.put('/:id', requirePermission('PRODUCTS_UPDATE'), c.update);

module.exports = router;