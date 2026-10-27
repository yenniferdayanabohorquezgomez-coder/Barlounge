const router = require('express').Router();
const controller = require('../controllers/orderController');
const {
    requireAuth
} = require('../middleware/authMiddleware');
const {
    requirePermission
} = require('../middleware/permissionMiddleware');

// Todas las rutas requieren una sesión válida.
router.use(requireAuth);

// ------------------------------------------------------------
// Consultas
// ------------------------------------------------------------
// GET /api/orders?siteId=1
router.get(
    '/',
    requirePermission('ORDERS_READ'),
    controller.list
);

// IMPORTANTE: esta ruta debe ir antes de /:id.
// GET /api/orders/availability?siteId=1&orderId=1
router.get(
    '/availability',
    requirePermission('ORDERS_READ'),
    controller.availability
);

// GET /api/orders/:id
router.get(
    '/:id',
    requirePermission('ORDERS_READ'),
    controller.getById
);

// ------------------------------------------------------------
// Crear pedidos
// ------------------------------------------------------------
// POST /api/orders
router.post(
    '/',
    requirePermission('ORDERS_CREATE'),
    controller.create
);

// ------------------------------------------------------------
// Administrar productos del pedido
// ------------------------------------------------------------
// POST /api/orders/:id/items
router.post(
    '/:id/items',
    requirePermission('ORDERS_UPDATE'),
    controller.addItem
);

// PUT /api/orders/:id/items/:itemId
router.put(
    '/:id/items/:itemId',
    requirePermission('ORDERS_UPDATE'),
    controller.updateItem
);

// DELETE /api/orders/:id/items/:itemId
router.delete(
    '/:id/items/:itemId',
    requirePermission('ORDERS_REMOVE_ITEM'),
    controller.removeItem
);

// ------------------------------------------------------------
// Guardar el pedido sin cerrarlo
// ------------------------------------------------------------
// POST /api/orders/:id/save
router.post(
    '/:id/save',
    requirePermission('ORDERS_SAVE'),
    controller.save
);

// Cancelar un pedido vacío y liberar la mesa.
router.post(
    '/:id/cancel',
    requirePermission('ORDERS_CANCEL'),
    controller.cancel
);

module.exports = router;