const service = require('../services/dashboardService');

async function summary(req, res, next) {
    try {
        res.json(await service.getSummary());
    } catch (e) {
        next(e);
    }
}

module.exports = {
    summary
};