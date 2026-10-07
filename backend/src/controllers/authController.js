const service = require('../services/authService');

// ============================================================
// LOGIN
// ============================================================
async function login(
    req,
    res,
    next
) {

    try {

        const {
            code,
            password
        } = req.body;

        if (
            !code ||
            !password
        ) {
            return res.status(400).json({
                message:
                    'Code and password are required.'
            });
        }

        const out =
            await service.login(
                code.trim(),
                password
            );

        if (!out) {
            return res.status(401).json({
                message:
                    'Invalid credentials or inactive user.'
            });
        }

        res.json(out);

    } catch (e) {

        next(e);
    }
}

// ============================================================
// PASO 1
// SOLICITAR CÓDIGO POR CORREO
// ============================================================
async function recover(
    req,
    res,
    next
) {

    try {

        const email =
            req.body.email
                ?.trim()
                .toLowerCase();

        if (!email) {
            return res.status(400).json({
                message:
                    'Email is required.'
            });
        }

        const result =
            await service.startRecovery(
                email
            );

        if (!result) {
            return res.status(404).json({
                message:
                    'No active user is associated with that email.'
            });
        }

        res.json(result);

    } catch (e) {

        next(e);
    }
}

// ============================================================
// PASO 2
// VERIFICAR CÓDIGO
// ============================================================
async function verifyRecoveryCode(
    req,
    res,
    next
) {

    try {

        const email =
            req.body.email
                ?.trim()
                .toLowerCase();

        const recoveryCode =
            req.body.recoveryCode
                ?.trim();

        if (
            !email ||
            !recoveryCode
        ) {
            return res.status(400).json({
                message:
                    'Email and verification code are required.'
            });
        }

        if (
            !/^\d{6}$/.test(
                recoveryCode
            )
        ) {
            return res.status(400).json({
                message:
                    'The verification code must contain 6 digits.'
            });
        }

        const result =
            await service.verifyRecoveryCode(
                email,
                recoveryCode
            );

        if (!result) {
            return res.status(400).json({
                message:
                    'Invalid or expired verification code.'
            });
        }

        res.json(result);

    } catch (e) {

        next(e);
    }
}

// ============================================================
// PASO 3
// ACTUALIZAR CONTRASEÑA
// ============================================================
async function reset(
    req,
    res,
    next
) {

    try {

        const {
            resetToken,
            newPassword
        } = req.body;

        if (
            !resetToken ||
            !newPassword ||
            newPassword.length < 8
        ) {
            return res.status(400).json({
                message:
                    'A valid reset token and a password of at least 8 characters are required.'
            });
        }

        const ok =
            await service.resetPassword(
                resetToken,
                newPassword
            );

        if (!ok) {
            return res.status(400).json({
                message:
                    'The password reset request is invalid or expired.'
            });
        }

        res.json({
            message:
                'Password updated successfully.'
        });

    } catch (e) {

        next(e);
    }
}

// ============================================================
// EXPORTACIONES
// ============================================================
module.exports = {
    login,
    recover,
    verifyRecoveryCode,
    reset
};