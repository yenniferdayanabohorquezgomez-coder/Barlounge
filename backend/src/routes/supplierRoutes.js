const router = require('express').Router();
const c = require('../controllers/supplierController');
const {
    requireAuth
} = require('../middleware/authMiddleware');
const {
    requirePermission
} = require('../middleware/permissionMiddleware');

router.use(requireAuth);
router.get('/', requirePermission('SUPPLIERS_READ'), c.list);
router.get('/:id', requirePermission('SUPPLIERS_READ'), c.getById);
router.post('/', requirePermission('SUPPLIERS_CREATE'), c.create);
router.put('/:id', requirePermission('SUPPLIERS_UPDATE'), c.update);

module.exports = router;