
const router = require('express').Router();

const controller = require('../controllers/tableController');

const { requireAuth } = require('../middleware/authMiddleware');

const {
    requirePermission
} = require('../middleware/permissionMiddleware');

router.use(requireAuth);

// CONSULTAR MESAS
router.get(
    '/',
    requirePermission('TABLES_READ'),
    controller.list
);

// CREAR MESA
router.post(
    '/',
    requirePermission('TABLES_CREATE'),
    controller.create
);

module.exports = router;
