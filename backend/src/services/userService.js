const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const audit = require('./auditService');

// ============================================================
// LISTAR USUARIOS
// ============================================================
async function list() {
    const [rows] = await pool.query(`
        SELECT
            u.user_id,
            u.code,
            u.name,
            u.email,
            u.role_id,
            r.name AS role,
            u.site_id,
            s.name AS site,
            u.status,
            u.created_at,
            u.updated_at
        FROM users u
        INNER JOIN roles r
            ON r.role_id = u.role_id
        INNER JOIN sites s
            ON s.site_id = u.site_id
        ORDER BY u.name ASC
    `);

    return rows;
}

// ============================================================
// OBTENER USUARIO POR ID
// ============================================================
async function getById(id) {
    const [rows] = await pool.query(`
        SELECT
            u.user_id,
            u.code,
            u.name,
            u.email,
            u.role_id,
            r.name AS role,
            u.site_id,
            s.name AS site,
            u.status
        FROM users u
        INNER JOIN roles r
            ON r.role_id = u.role_id
        INNER JOIN sites s
            ON s.site_id = u.site_id
        WHERE u.user_id = ?
        LIMIT 1
    `, [id]);

    return rows[0] || null;
}

// ============================================================
// CREAR USUARIO
// ============================================================
async function create(data, actorId) {

    // --------------------------------------------------------
    // Encriptar contraseña.
    // --------------------------------------------------------
    const hash = await bcrypt.hash(data.password, 10);

    // --------------------------------------------------------
    // Insertar usuario.
    // El correo se guarda en la columna email.
    // --------------------------------------------------------
    const [result] = await pool.query(`
        INSERT INTO users
            (
                code,
                name,
                email,
                password_hash,
                role_id,
                site_id,
                status
            )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
        data.code,
        data.name,
        data.email,
        hash,
        data.roleId,
        data.siteId,
        data.status
    ]);

    // --------------------------------------------------------
    // Registrar auditoría.
    // --------------------------------------------------------
    await audit.log({
        userId: actorId,
        action: 'CREATE',
        entity: 'users',
        entityId: result.insertId,
        result: 'SUCCESS'
    });

    return getById(result.insertId);
}

// ============================================================
// ACTUALIZAR USUARIO
// ============================================================
async function update(id, data, actorId) {

    // --------------------------------------------------------
    // Si se recibió nueva contraseña,
    // se actualiza también password_hash.
    // --------------------------------------------------------
    if (data.password) {

        const hash = await bcrypt.hash(
            data.password,
            10
        );

        await pool.query(`
            UPDATE users
            SET
                code = ?,
                name = ?,
                email = ?,
                password_hash = ?,
                role_id = ?,
                site_id = ?,
                status = ?
            WHERE user_id = ?
        `, [
            data.code,
            data.name,
            data.email,
            hash,
            data.roleId,
            data.siteId,
            data.status,
            id
        ]);

    } else {

        // ----------------------------------------------------
        // Si no se recibió nueva contraseña,
        // se conserva la contraseña actual.
        // ----------------------------------------------------
        await pool.query(`
            UPDATE users
            SET
                code = ?,
                name = ?,
                email = ?,
                role_id = ?,
                site_id = ?,
                status = ?
            WHERE user_id = ?
        `, [
            data.code,
            data.name,
            data.email,
            data.roleId,
            data.siteId,
            data.status,
            id
        ]);
    }

    // --------------------------------------------------------
    // Registrar auditoría.
    // --------------------------------------------------------
    await audit.log({
        userId: actorId,
        action: 'UPDATE',
        entity: 'users',
        entityId: id,
        result: 'SUCCESS'
    });

    return getById(id);
}

// ============================================================
// EXPORTACIONES
// ============================================================
module.exports = {
    list,
    getById,
    create,
    update
};