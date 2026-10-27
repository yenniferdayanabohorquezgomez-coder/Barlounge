const service = require('../services/tableService');

// ============================================================
// LISTAR MESAS
// ============================================================
async function list(req, res, next) {

    try {

        // ----------------------------------------------------
        // El mesero utiliza exclusivamente su sede asignada.
        // El administrador puede solicitar otra sede activa.
        // ----------------------------------------------------
        const role = String(
            req.user.role_name || ''
        ).toLowerCase();

        const isWaiter = [
            'mesero',
            'waiter'
        ].includes(role);

        const siteId = isWaiter
            ? Number(req.user.site_id)
            : Number(req.query.siteId);

        // ----------------------------------------------------
        // Validar sede
        // ----------------------------------------------------
        if (
            !Number.isInteger(siteId) ||
            siteId <= 0
        ) {
            return res.status(400).json({
                message: 'Select a site to view its tables.'
            });
        }

        // ----------------------------------------------------
        // Consultar mesas
        // ----------------------------------------------------
        const tables = await service.list(siteId);

        return res.json(tables);

    } catch (error) {

        next(error);

    }
}

// ============================================================
// EXPORTAR CONTROLADOR
// ============================================================
module.exports = {
    list
};