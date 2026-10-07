import api from './api';

// ============================================================
// LOGIN
// ============================================================
export const login = (
    code,
    password
) =>
    api
        .post('/auth/login', {
            code,
            password
        })
        .then(r => r.data);

// ============================================================
// PASO 1
// Solicitar código por correo.
// ============================================================
export const recoverPassword = (
    email
) =>
    api
        .post('/auth/recover', {
            email
        })
        .then(r => r.data);

// ============================================================
// PASO 2
// Verificar código.
// ============================================================
export const verifyRecoveryCode = (
    email,
    recoveryCode
) =>
    api
        .post('/auth/recover/verify', {
            email,
            recoveryCode
        })
        .then(r => r.data);

// ============================================================
// PASO 3
// Actualizar contraseña.
// ============================================================
export const resetPassword = (
    resetToken,
    newPassword
) =>
    api
        .post('/auth/reset', {
            resetToken,
            newPassword
        })
        .then(r => r.data);