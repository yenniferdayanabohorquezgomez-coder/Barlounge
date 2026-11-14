const service = require('../services/reportService');

function controllerError(status, message) {
    const error = new Error(message);
    error.status = status;
    error.publicMessage = message;
    return error;
}

function validDate(value) {
    if (
        typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const [year, month, day] = value
        .split('-')
        .map(Number);

    const date = new Date(
        Date.UTC(year, month - 1, day)
    );

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

function getFilters(req) {
    const { startDate, endDate } = req.query;

    if (!validDate(startDate) || !validDate(endDate)) {
        throw controllerError(
            400,
            'Select a valid start date and end date.'
        );
    }

    if (startDate > endDate) {
        throw controllerError(
            400,
            'The start date cannot be later than the end date.'
        );
    }

    let siteId = null;

    if (
        req.query.siteId !== undefined &&
        req.query.siteId !== ''
    ) {
        siteId = Number(req.query.siteId);

        if (
            !Number.isInteger(siteId) ||
            siteId <= 0
        ) {
            throw controllerError(
                400,
                'Select a valid site.'
            );
        }
    }

    return {
        startDate,
        endDate,
        siteId
    };
}

async function sales(req, res, next) {
    try {
        const filters = getFilters(req);

        const report = await service.getSalesReport(
            filters
        );

        res.json({
            filters,
            ...report
        });
    } catch (error) {
        next(error);
    }
}

async function topProducts(req, res, next) {
    try {
        const filters = getFilters(req);

        const rows = await service.getTopProductsReport(
            filters
        );

        res.json({
            filters,
            rows
        });
    } catch (error) {
        next(error);
    }
}

async function inventory(req, res, next) {
    try {
        let siteId = null;

        if (
            req.query.siteId !== undefined &&
            req.query.siteId !== ''
        ) {
            siteId = Number(req.query.siteId);

            if (
                !Number.isInteger(siteId) ||
                siteId <= 0
            ) {
                throw controllerError(
                    400,
                    'Select a valid site.'
                );
            }
        }

        const rows = await service.getInventoryReport(
            siteId
        );

        res.json({
            siteId,
            rows
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    sales,
    topProducts,
    inventory
};