const router = require('express').Router();
const c = require('../controllers/authController');

// ============================================================
// LOGIN
// ============================================================
router.post(
    '/login',
    c.login
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