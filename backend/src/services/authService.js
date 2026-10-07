const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const pool = require('../config/db');
const {
    sendRecoveryCode
} = require('./emailService');

// ============================================================
// AUTENTICACIÓN Y RECUPERACIÓN
// ============================================================
// LOGIN:
// código + contraseña
//
// RECUPERACIÓN:
// correo
// código de verificación
// resetToken
// nueva contraseña
// ============================================================

// ============================================================
// TOKEN NORMAL DE LOGIN
// ============================================================
function tokenFor(user) {

    return jwt.sign(
        {
            userId: user.user_id
        },
        process.env.JWT_SECRET,
        {
            expiresIn:
                process.env.JWT_EXPIRES_IN || '15m'
        }
    );
}

// ============================================================
// TOKEN TEMPORAL PARA CAMBIAR CONTRASEÑA
// ============================================================
function resetTokenFor(user) {

    return jwt.sign(
        {
            userId: user.user_id,
            purpose: 'password_reset'
        },
        process.env.JWT_SECRET,
        {
            expiresIn:
                process.env.PASSWORD_RESET_EXPIRES_IN || '10m'
        }
    );
}

// ============================================================
// HASH DEL CÓDIGO
// ============================================================
function hashRecoveryCode(code) {

    return crypto
        .createHash('sha256')
        .update(
            `${code}:${process.env.JWT_SECRET}`
        )
        .digest('hex');
}

// ============================================================
// LOGIN
// ============================================================
async function login(
    code,
    password
) {

    const [rows] =
        await pool.query(`
            SELECT
                u.user_id,
                u.code,
                u.name,
                u.password_hash,
                u.role_id,
                u.site_id,
                u.status,
                r.name AS role_name,
                s.name AS site_name
            FROM users u
            INNER JOIN roles r
                ON r.role_id = u.role_id
            INNER JOIN sites s
                ON s.site_id = u.site_id
            WHERE u.code = ?
            LIMIT 1
        `, [code]);

    if (
        !rows.length ||
        rows[0].status !== 'ACTIVE'
    ) {
        return null;
    }

    const valid =
        await bcrypt.compare(
            password,
            rows[0].password_hash
        );

    if (!valid) {
        return null;
    }

    const u = rows[0];

    return {

        token: tokenFor(u),

        user: {
            userId: u.user_id,
            code: u.code,
            name: u.name,
            roleId: u.role_id,
            role: u.role_name,
            siteId: u.site_id,
            siteName: u.site_name
        }
    };
}

// ============================================================
// PASO 1
// INICIAR RECUPERACIÓN POR CORREO
// ============================================================
async function startRecovery(
    email
) {

    // --------------------------------------------------------
    // Buscar usuario por correo.
    // --------------------------------------------------------
    const [users] =
        await pool.query(`
            SELECT
                user_id,
                code,
                name,
                email,
                status
            FROM users
            WHERE email = ?
            LIMIT 1
        `, [email]);

    // Usuario inexistente o inactivo.
    if (
        !users.length ||
        users[0].status !== 'ACTIVE'
    ) {
        return null;
    }

    const user = users[0];

    // --------------------------------------------------------
    // Invalidar códigos anteriores.
    // --------------------------------------------------------
    await pool.query(`
        UPDATE password_recovery_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND used_at IS NULL
    `, [
        user.user_id
    ]);

    // --------------------------------------------------------
    // Generar código de 6 dígitos.
    // --------------------------------------------------------
    const recoveryCode =
        String(
            crypto.randomInt(
                100000,
                1000000
            )
        );

    // --------------------------------------------------------
    // Guardar hash del código.
    // --------------------------------------------------------
    const codeHash =
        hashRecoveryCode(
            recoveryCode
        );

    // --------------------------------------------------------
    // Tiempo de expiración.
    // --------------------------------------------------------
    const expirationMinutes =
        Number(
            process.env.PASSWORD_RECOVERY_MINUTES ||
            10
        );

    // --------------------------------------------------------
    // Guardar código.
    // --------------------------------------------------------
    await pool.query(`
        INSERT INTO password_recovery_tokens
            (
                user_id,
                code_hash,
                expires_at
            )
        VALUES
            (
                ?,
                ?,
                DATE_ADD(
                    NOW(),
                    INTERVAL ${expirationMinutes} MINUTE
                )
            )
    `, [
        user.user_id,
        codeHash
    ]);

    // --------------------------------------------------------
    // Enviar código por correo.
    // --------------------------------------------------------
    await sendRecoveryCode(
        user.email,
        user.name,
        recoveryCode,
        expirationMinutes
    );

    return {
        message:
            'A verification code has been sent to your email.'
    };
}

// ============================================================
// PASO 2
// VERIFICAR CÓDIGO
// ============================================================
async function verifyRecoveryCode(
    email,
    recoveryCode
) {

    // --------------------------------------------------------
    // Buscar usuario por correo.
    // --------------------------------------------------------
    const [users] =
        await pool.query(`
            SELECT
                user_id,
                code,
                name,
                email,
                status
            FROM users
            WHERE email = ?
            LIMIT 1
        `, [email]);

    if (
        !users.length ||
        users[0].status !== 'ACTIVE'
    ) {
        return null;
    }

    const user = users[0];

    // --------------------------------------------------------
    // Convertir código recibido a hash.
    // --------------------------------------------------------
    const codeHash =
        hashRecoveryCode(
            recoveryCode
        );

    // --------------------------------------------------------
    // Buscar código válido.
    // --------------------------------------------------------
    const [tokens] =
        await pool.query(`
            SELECT
                token_id
            FROM password_recovery_tokens
            WHERE user_id = ?
              AND code_hash = ?
              AND used_at IS NULL
              AND expires_at > NOW()
            ORDER BY token_id DESC
            LIMIT 1
        `, [
            user.user_id,
            codeHash
        ]);

    // Código incorrecto o expirado.
    if (!tokens.length) {
        return null;
    }

    // --------------------------------------------------------
    // Marcar como utilizado.
    // --------------------------------------------------------
    await pool.query(`
        UPDATE password_recovery_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE token_id = ?
    `, [
        tokens[0].token_id
    ]);

    // --------------------------------------------------------
    // Generar autorización temporal
    // para actualizar contraseña.
    // --------------------------------------------------------
    return {
        resetToken:
            resetTokenFor(user)
    };
}

// ============================================================
// PASO 3
// ACTUALIZAR CONTRASEÑA
// ============================================================
async function resetPassword(
    resetToken,
    newPassword
) {

    let payload;

    // --------------------------------------------------------
    // Validar JWT.
    // --------------------------------------------------------
    try {

        payload =
            jwt.verify(
                resetToken,
                process.env.JWT_SECRET
            );

    } catch (error) {

        return null;
    }

    // --------------------------------------------------------
    // Verificar propósito.
    // --------------------------------------------------------
    if (
        payload.purpose !==
            'password_reset' ||
        !payload.userId
    ) {
        return null;
    }

    // --------------------------------------------------------
    // Encriptar nueva contraseña.
    // --------------------------------------------------------
    const hash =
        await bcrypt.hash(
            newPassword,
            10
        );

    // --------------------------------------------------------
    // Actualizar contraseña.
    // --------------------------------------------------------
    const [result] =
        await pool.query(`
            UPDATE users
            SET
                password_hash = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
              AND status = 'ACTIVE'
        `, [
            hash,
            payload.userId
        ]);

    if (
        !result.affectedRows
    ) {
        return null;
    }

    // --------------------------------------------------------
    // Invalidar códigos de recuperación pendientes.
    // --------------------------------------------------------
    await pool.query(`
        UPDATE password_recovery_tokens
        SET used_at = COALESCE(
            used_at,
            CURRENT_TIMESTAMP
        )
        WHERE user_id = ?
          AND used_at IS NULL
    `, [
        payload.userId
    ]);

    return true;
}

// ============================================================
// EXPORTACIONES
// ============================================================
module.exports = {
    login,
    startRecovery,
    verifyRecoveryCode,
    resetPassword
};