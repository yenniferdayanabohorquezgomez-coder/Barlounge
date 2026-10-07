const service = require('../services/siteService');

function valid(d, create = true) {
    return Boolean(d.code || !create) && Boolean(d.name && d.address && d.status);
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
            message: 'Site not found.'
        });
        res.json(row);
    } catch (e) {
        next(e);
    }
}

async function create(req, res, next) {
    try {
        if (!valid(req.body, true)) return res.status(400).json({
            message: 'Invalid site data.'
        });
        res.status(201).json(await service.create(req.body, req.user.user_id));
    } catch (e) {
        next(e);
    }
}

async function update(req, res, next) {
    try {
        if (!valid(req.body, false)) return res.status(400).json({
            message: 'Invalid site data.'
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