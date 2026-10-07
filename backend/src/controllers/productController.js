const service = require('../services/productService');

function valid(d) {
    return Boolean(d.code && d.name && d.purchaseUnit && d.saleUnit && d.productTypeId && d.supplierId && d.salePrice !== undefined && d.status) && Number(d.salePrice) >= 0;
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
            message: 'Product not found.'
        });
        res.json(r);
    } catch (e) {
        next(e);
    }
}

async function create(req, res, next) {
    try {
        if (!valid(req.body)) return res.status(400).json({
            message: 'Invalid product data.'
        });
        res.status(201).json(await service.create(req.body, req.user.user_id));
    } catch (e) {
        next(e);
    }
}

async function update(req, res, next) {
    try {
        if (!valid(req.body)) return res.status(400).json({
            message: 'Invalid product data.'
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