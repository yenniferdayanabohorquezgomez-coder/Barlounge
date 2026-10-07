const router = require('express').Router();
const c = require('../controllers/siteController');
const {
    requireAuth
} = require('../middleware/authMiddleware');
const {
    requirePermission
} = require('../middleware/permissionMiddleware');

router.use(requireAuth);
router.get('/', requirePermission('SITES_READ'), c.list);
router.get('/:id', requirePermission('SITES_READ'), c.getById);
router.post('/', requirePermission('SITES_CREATE'), c.create);
router.put('/:id', requirePermission('SITES_UPDATE'), c.update);

module.exports = router;
