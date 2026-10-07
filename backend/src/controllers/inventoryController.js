const service = require('../services/inventoryService');

async function list(req, res, next) {
    try {
        const requested = req.query.siteId ? Number(req.query.siteId) : null;
        const siteId = req.user.role_name === 'Cajero' ? req.user.site_id : requested;
        if (!siteId) return res.status(400).json({
            message: 'A site is required.'
        });
        res.json(await service.list(siteId));
    } catch (e) {
        next(e);
    }
}

async function increment(req, res, next) {
    try {
        const amount = Number(req.body.amount);
        const siteId = req.user.role_name === 'Cajero' ? req.user.site_id : Number(req.body.siteId);
        if (!siteId) return res.status(400).json({
            message: 'A site is required.'
        });
        res.json(await service.increment(Number(req.params.id), amount, siteId, req.user.user_id));
    } catch (e) {
        next(e);
    }
}

module.exports = {
    list,
    increment
};