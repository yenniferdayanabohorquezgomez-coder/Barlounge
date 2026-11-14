const router = require('express').Router();
const c = require('../controllers/authController');
const {
    requireAuth
} = require('../middleware/authMiddleware');

// ============================================================
// LOGIN
// ============================================================
router.post(
    '/login',
    c.login
);

router.post(
    '/logout',
    requireAuth,
    c.logout
);

// ============================================================
// RECUPERACIÓN - PASO 1
// Enviar código al correo.
// ============================================================
router.post(
    '/recover',
    c.recover
);

// ============================================================
// RECUPERACIÓN - PASO 2
// Verificar código.
// ============================================================
router.post(
    '/recover/verify',
    c.verifyRecoveryCode
);

// ============================================================
// RECUPERACIÓN - PASO 3
// Actualizar contraseña.
// ============================================================
router.post(
    '/reset',
    c.reset
);

module.exports = router;