
const service = require('../services/tableService');

// LISTAR MESAS
async function list(req, res, next) {
    try {
        const role = String(req.user.role_name || '').toLowerCase();

        const isWaiter = ['mesero', 'waiter'].includes(role);

        const siteId = isWaiter
            ? Number(req.user.site_id)
            : Number(req.query.siteId);

        if (!Number.isInteger(siteId) || siteId <= 0) {
            return res.status(400).json({
                message: 'Select a site to view its tables.'
            });
        }

        const tables = await service.list(siteId);

        return res.json(tables);
    } catch (error) {
        next(error);
    }
}

// CREAR MESA
async function create(req, res, next) {
    try {
        const role = String(req.user.role_name || '').toLowerCase();

        const isAdmin = [
            'administrador',
            'administrator',
            'admin'
        ].includes(role);

        if (!isAdmin) {
            return res.status(403).json({
                message: 'Only an administrator can create tables.'
            });
        }

        const { siteId, tableNumber } = req.body;

        const table = await service.create(siteId, tableNumber);

        return res.status(201).json({
            message: 'Table created successfully.',
            table
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    list,
    create
};
