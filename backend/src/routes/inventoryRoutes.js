const router = require('express').Router();

const controller = require('../controllers/inventoryController');

const {
    requireAuth
} = require('../middleware/authMiddleware');

const {
    requirePermission
} = require('../middleware/permissionMiddleware');

router.use(requireAuth);

// Existing inventory operations.
router.get(
    '/',
    requirePermission('INVENTORY_READ'),
    controller.list
);

router.patch(
    '/:id/increment',
    requirePermission('INVENTORY_INCREMENT'),
    controller.increment
);

// Product Assignment module.
router.get(
    '/assignments',
    requirePermission('PRODUCT_ASSIGNMENT_READ'),
    controller.listAssignments
);

router.get(
    '/assignable-products',
    requirePermission('PRODUCT_ASSIGNMENT_READ'),
    controller.listAssignableProducts
);

router.post(
    '/assignments',
    requirePermission('PRODUCT_ASSIGNMENT_CREATE'),
    controller.assignProduct
);

router.delete(
    '/assignments/:id',
    requirePermission('PRODUCT_ASSIGNMENT_DELETE'),
    controller.unassignProduct
);

module.exports = router;
