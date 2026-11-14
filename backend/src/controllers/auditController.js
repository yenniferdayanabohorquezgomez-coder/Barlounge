const auditService = require('../services/auditService');

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

async function list(req, res, next) {
    try {
        const {
            startDate,
            endDate,
            search = ''
        } = req.query;

        let page = Number(req.query.page || 1);
        let pageSize = Number(req.query.pageSize || 20);

        if (
            !Number.isInteger(page) ||
            page < 1
        ) {
            return res.status(400).json({
                message: 'Invalid page number.'
            });
        }

        if (
            !Number.isInteger(pageSize) ||
            pageSize < 1 ||
            pageSize > 100
        ) {
            return res.status(400).json({
                message: 'Page size must be between 1 and 100.'
            });
        }

        if (
            startDate &&
            !validDate(startDate)
        ) {
            return res.status(400).json({
                message: 'Invalid start date.'
            });
        }

        if (
            endDate &&
            !validDate(endDate)
        ) {
            return res.status(400).json({
                message: 'Invalid end date.'
            });
        }

        if (
            startDate &&
            endDate &&
            startDate > endDate
        ) {
            return res.status(400).json({
                message: 'The start date cannot be later than the end date.'
            });
        }

        const cleanSearch = String(search)
            .trim()
            .slice(0, 100);

        const result = await auditService.list({
            startDate: startDate || null,
            endDate: endDate || null,
            search: cleanSearch,
            page,
            pageSize
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    list
};