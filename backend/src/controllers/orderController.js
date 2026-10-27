const service = require('../services/orderService');

// ============================================================
// CONTROLADOR DE PEDIDOS
// ============================================================
// Ejecuta cada controlador y entrega los errores al middleware
// centralizado de Express.
function handle(callback) {
    return (req, res, next) => {
        Promise.resolve(callback(req, res, next)).catch(next);
    };
}

// ------------------------------------------------------------
// Resolver la sede autorizada para la solicitud.
// El administrador puede seleccionar una sede.
// Los demás usuarios quedan limitados a su sede asignada.
// ------------------------------------------------------------
function getSiteId(req) {
    const role = String(req.user.role_name || '').toLowerCase();

    const isAdministrator = [
        'administrador',
        'administrator',
        'admin'
    ].includes(role);

    const requestedSite = req.body?.siteId
        ?? req.query?.siteId;

    const siteId = isAdministrator
        ? Number(requestedSite ?? req.user.site_id)
        : Number(req.user.site_id);

    if (!Number.isInteger(siteId) || siteId <= 0) {
        const error = new Error('Select a valid site.');
        error.status = 400;
        error.publicMessage = 'Select a valid site.';
        throw error;
    }

    return siteId;
}

// ============================================================
// GET /api/orders
// Listar pedidos abiertos de la sede autorizada.
// ============================================================
const list = handle(async (req, res) => {
    const siteId = getSiteId(req);
    const orders = await service.list(siteId);

    res.json(orders);
});

// ============================================================
// POST /api/orders
// Crear un pedido para una mesa libre.
// ============================================================
const create = handle(async (req, res) => {
    const siteId = getSiteId(req);
    const { tableId } = req.body;

    const order = await service.create(
        tableId,
        siteId,
        req.user.user_id
    );

    res.status(201).json({
        message: 'Order created successfully.',
        order
    });
});

// ============================================================
// GET /api/orders/availability
// Consultar productos y disponibilidad por sede.
// ============================================================
const availability = handle(async (req, res) => {
    const siteId = getSiteId(req);
    const { orderId } = req.query;

    const products = await service.availability(
        siteId,
        orderId || null
    );

    res.json(products);
});

// ============================================================
// GET /api/orders/:id
// Consultar detalle de un pedido.
// ============================================================
const getById = handle(async (req, res) => {
    const siteId = getSiteId(req);

    const order = await service.getById(
        req.params.id,
        siteId
    );

    res.json(order);
});

// ============================================================
// POST /api/orders/:id/items
// Agregar un producto al pedido.
// ============================================================
const addItem = handle(async (req, res) => {
    const siteId = getSiteId(req);
    const { productId, quantity } = req.body;

    const order = await service.addItem(
        req.params.id,
        siteId,
        productId,
        quantity,
        req.user.user_id
    );

    res.json({
        message: 'Product added to the order successfully.',
        order
    });
});

// ============================================================
// PUT /api/orders/:id/items/:itemId
// Actualizar la cantidad de un producto.
// ============================================================
const updateItem = handle(async (req, res) => {
    const siteId = getSiteId(req);
    const { quantity } = req.body;

    const order = await service.updateItem(
        req.params.id,
        req.params.itemId,
        siteId,
        quantity,
        req.user.user_id
    );

    res.json({
        message: 'Order item updated successfully.',
        order
    });
});

// ============================================================
// DELETE /api/orders/:id/items/:itemId
// Retirar un producto del pedido.
// ============================================================
const removeItem = handle(async (req, res) => {
    const siteId = getSiteId(req);

    const order = await service.removeItem(
        req.params.id,
        req.params.itemId,
        siteId,
        req.user.user_id
    );

    res.json({
        message: 'Product removed from the order successfully.',
        order
    });
});

// ============================================================
// POST /api/orders/:id/save
// Guardar sin cerrar el pedido.
// ============================================================
const save = handle(async (req, res) => {
    const siteId = getSiteId(req);

    const order = await service.save(
        req.params.id,
        siteId,
        req.user.user_id
    );

    res.json({
        message: 'Order saved successfully.',
        order
    });
});

const cancel = handle(async (req, res) => {
    const siteId = getSiteId(req);

    const order = await service.cancel(
        req.params.id,
        siteId,
        req.user.user_id
    );

    res.json({
        message: 'Order cancelled and table released.',
        order
    });
});

module.exports = {
    list,
    create,
    availability,
    getById,
    addItem,
    updateItem,
    removeItem,
    save,
    cancel
};
