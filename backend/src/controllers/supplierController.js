const service = require('../services/supplierService');

function valid(d) {
    return Boolean(d.name && d.status);
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
        const r = await service.getById(req.params.id);
        if (!r) return res.status(404).json({
            message: 'Supplier not found.'
        });
        res.json(r);
    } catch (e) {
        next(e);
    }
}

async function create(req, res, next) {
    try {
        if (!valid(req.body)) return res.status(400).json({
            message: 'Invalid supplier data.'
        });
        res.status(201).json(await service.create(req.body, req.user.user_id));
    } catch (e) {
        next(e);
    }
}

async function update(req, res, next) {
    try {
        if (!valid(req.body)) return res.status(400).json({
            message: 'Invalid supplier data.'
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