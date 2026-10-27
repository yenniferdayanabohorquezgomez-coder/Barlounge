const service = require('../services/inventoryService');

function parseSiteId(value) {
    const siteId = Number(value);

    return Number.isInteger(siteId) && siteId > 0
        ? siteId
        : null;
}

// ============================================================
// INVENTORY LIST
// GET /api/inventory?siteId=1
// ============================================================

async function list(req, res, next) {
    try {
        const requestedSiteId = parseSiteId(
            req.query.siteId
        );

        const role =
            req.user.role_name || req.user.role;

        const siteId = role === 'Cajero'
            ? parseSiteId(req.user.site_id ?? req.user.siteId)
            : requestedSiteId;

        if (!siteId) {
            return res.status(400).json({
                message: 'A valid site is required.'
            });
        }

        return res.json(
            await service.list(siteId)
        );
    } catch (error) {
        return next(error);
    }
}

// ============================================================
// LIST ASSIGNED PRODUCTS
// GET /api/inventory/assignments?siteId=1
// ============================================================

async function listAssignments(req, res, next) {
    try {
        const siteId = parseSiteId(req.query.siteId);

        if (!siteId) {
            return res.status(400).json({
                message: 'A valid site is required.'
            });
        }

        return res.json(
            await service.listAssignments(siteId)
        );
    } catch (error) {
        return next(error);
    }
}

// ============================================================
// LIST ASSIGNABLE PRODUCTS
// GET /api/inventory/assignable-products?siteId=1
// ============================================================

async function listAssignableProducts(req, res, next) {
    try {
        const siteId = parseSiteId(req.query.siteId);

        if (!siteId) {
            return res.status(400).json({
                message: 'A valid site is required.'
            });
        }

        return res.json(
            await service.listAssignableProducts(siteId)
        );
    } catch (error) {
        return next(error);
    }
}

// ============================================================
// ASSIGN PRODUCT
// POST /api/inventory/assignments
// ============================================================

async function assignProduct(req, res, next) {
    try {
        const siteId = parseSiteId(req.body.siteId);
        const productId = Number(req.body.productId);

        if (!siteId) {
            return res.status(400).json({
                message: 'A valid site is required.'
            });
        }

        if (
            !Number.isInteger(productId) ||
            productId <= 0
        ) {
            return res.status(400).json({
                message: 'A valid product is required.'
            });
        }

        const assignment = await service.assignProduct(
            siteId,
            productId,
            req.user.user_id
        );

        return res.status(201).json({
            message: 'Product assigned to site successfully.',
            assignment
        });
    } catch (error) {
        return next(error);
    }
}

// ============================================================
// UNASSIGN PRODUCT
// DELETE /api/inventory/assignments/:id?siteId=1
// ============================================================

async function unassignProduct(req, res, next) {
    try {
        const inventoryId = Number(req.params.id);

        const siteId = parseSiteId(
            req.query.siteId ?? req.body?.siteId
        );

        if (
            !Number.isInteger(inventoryId) ||
            inventoryId <= 0
        ) {
            return res.status(400).json({
                message: 'A valid assignment is required.'
            });
        }

        if (!siteId) {
            return res.status(400).json({
                message: 'A valid site is required.'
            });
        }

        const result = await service.unassignProduct(
            inventoryId,
            siteId,
            req.user.user_id
        );

        return res.json({
            message: 'Product unassigned successfully.',
            assignment: result
        });
    } catch (error) {
        return next(error);
    }
}

// ============================================================
// INCREMENT INVENTORY
// PATCH /api/inventory/:id/increment
// ============================================================

async function increment(req, res, next) {
    try {
        const amount = Number(req.body.amount);
        const role =
            req.user.role_name || req.user.role;

        const siteId = role === 'Cajero'
            ? parseSiteId(req.user.site_id ?? req.user.siteId)
            : parseSiteId(req.body.siteId);

        if (!siteId) {
            return res.status(400).json({
                message: 'A valid site is required.'
            });
        }

        const result = await service.increment(
            Number(req.params.id),
            amount,
            siteId,
            req.user.user_id
        );

        return res.json(result);
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    list,
    listAssignments,
    listAssignableProducts,
    assignProduct,
    unassignProduct,
    increment
};
