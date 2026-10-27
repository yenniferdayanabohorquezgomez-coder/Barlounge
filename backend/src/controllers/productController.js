const service = require('../services/productService');

// ============================================================
// PRODUCT VALIDATION
// ============================================================

function isValidPrice(value) {
    return (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        Number.isFinite(Number(value)) &&
        Number(value) >= 0
    );
}

function valid(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return false;
    }

    const requiredStrings = [
        data.code,
        data.name,
        data.purchaseUnit,
        data.saleUnit,
        data.status
    ];

    const stringsAreValid = requiredStrings.every(
        (value) =>
            typeof value === 'string' &&
            value.trim().length > 0
    );

    const productTypeId = Number(data.productTypeId);
    const supplierId = Number(data.supplierId);

    const idsAreValid =
        Number.isInteger(productTypeId) &&
        productTypeId > 0 &&
        Number.isInteger(supplierId) &&
        supplierId > 0;

    // Both prices are required.
    // A price of zero is allowed, but a missing or empty value is not.
    const purchasePriceIsValid = isValidPrice(
        data.purchasePrice
    );

    const salePriceIsValid = isValidPrice(
        data.salePrice
    );

    const statusIsValid = [
        'ACTIVE',
        'INACTIVE'
    ].includes(data.status);

    return (
        stringsAreValid &&
        idsAreValid &&
        purchasePriceIsValid &&
        salePriceIsValid &&
        statusIsValid
    );
}

// ============================================================
// LIST PRODUCTS
// ============================================================

async function list(req, res, next) {
    try {
        return res.json(await service.list());
    } catch (error) {
        return next(error);
    }
}

// ============================================================
// GET PRODUCT BY ID
// ============================================================

async function getById(req, res, next) {
    try {
        const product = await service.getById(
            req.params.id
        );

        if (!product) {
            return res.status(404).json({
                message: 'Product not found.'
            });
        }

        return res.json(product);
    } catch (error) {
        return next(error);
    }
}

// ============================================================
// CREATE PRODUCT
// ============================================================

async function create(req, res, next) {
    try {
        if (!valid(req.body)) {
            return res.status(400).json({
                message:
                    'Invalid product data. Enter the code, name, units, purchase price, sale price, product type, supplier and status.'
            });
        }

        const product = await service.create(
            req.body,
            req.user.user_id
        );

        return res.status(201).json(product);
    } catch (error) {
        return next(error);
    }
}

// ============================================================
// UPDATE PRODUCT
// ============================================================

async function update(req, res, next) {
    try {
        if (!valid(req.body)) {
            return res.status(400).json({
                message:
                    'Invalid product data. Enter the code, name, units, purchase price, sale price, product type, supplier and status.'
            });
        }

        const product = await service.update(
            req.params.id,
            req.body,
            req.user.user_id
        );

        return res.json(product);
    } catch (error) {
        return next(error);
    }
}

// ============================================================
// EXPORT CONTROLLER
// ============================================================

module.exports = {
    list,
    getById,
    create,
    update
};