const router = require('express').Router();
const c = require('../controllers/inventoryController');
const {
    requireAuth
} = require('../middleware/authMiddleware');
const {
    requirePermission
} = require('../middleware/permissionMiddleware');

router.use(requireAuth);
router.get('/', requirePermission('INVENTORY_READ'), c.list);
router.patch('/:id/increment', requirePermission('INVENTORY_INCREMENT'), c.increment);

module.exports = router;