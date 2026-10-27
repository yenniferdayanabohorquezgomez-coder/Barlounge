const router = require('express').Router();

const controller = require(
    '../controllers/tableController'
);

const {
    requireAuth
} = require(
    '../middleware/authMiddleware'
);

const {
    requirePermission
} = require(
    '../middleware/permissionMiddleware'
);

// ============================================================
// PROTEGER TODAS LAS RUTAS
// ============================================================
router.use(requireAuth);

// ============================================================
// GET /api/tables?siteId=1
// Consultar las mesas de una sede
// ============================================================
router.get(
    '/',
    requirePermission('TABLES_READ'),
    controller.list
);

// ============================================================
// EXPORTAR ROUTER
// ============================================================
module.exports = router;