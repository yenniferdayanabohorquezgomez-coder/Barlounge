const service = require('../services/userService');

function validate(d, create = true) {

    // --------------------------------------------------------
    // Campos obligatorios.
    // --------------------------------------------------------
    if (
        !d.code ||
        !d.name ||
        !d.email ||
        !d.roleId ||
        !d.siteId ||
        !d.status
    ) {
        return false;
    }

    // --------------------------------------------------------
    // Validación básica del correo.
    // --------------------------------------------------------
    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(d.email)) {
        return false;
    }

    // --------------------------------------------------------
    // La contraseña es obligatoria al crear.
    // --------------------------------------------------------
    if (
        create &&
        (!d.password || d.password.length < 8)
    ) {
        return false;
    }

    // --------------------------------------------------------
    // Si se envía contraseña durante una edición,
    // debe tener mínimo 8 caracteres.
    // --------------------------------------------------------
    if (
        d.password &&
        d.password.length < 8
    ) {
        return false;
    }

    return true;
}

async function list(req, res, next) {
    try {
        res.json(await service.list());
    } catch (e) {
        next(e);
    }
}

async function getById(req, res, next) {
    try {
        const row = await service.getById(req.params.id);
        if (!row) return res.status(404).json({
            message: 'User not found.'
        });
        res.json(row);
    } catch (e) {
        next(e);
    }
}

async function create(req, res, next) {
    try {
        if (!validate(req.body, true)) return res.status(400).json({
            message: 'Invalid user data.'
        });
        res.status(201).json(await service.create(req.body, req.user.user_id));
    } catch (e) {
        next(e);
    }
}

async function update(req, res, next) {
    try {
        if (!validate(req.body, false)) return res.status(400).json({
            message: 'Invalid user data.'
        });
        res.json(await service.update(req.params.id, req.body, req.user.user_id));
    } catch (e) {
        next(e);
    }
}

module.exports = {
    list,
    getById,
    create,
    update
};