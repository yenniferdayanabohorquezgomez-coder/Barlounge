// ============================================================
// ALGORITMO ITERATIVO PARA CALCULAR TOTALES
// ============================================================
//
// Recorre los productos de un pedido para calcular:
// - El subtotal de cada producto.
// - La cantidad total de unidades.
// - El total del pedido.
//
// Se utilizan ciclos iterativos, no recursión.
// ============================================================
function calculateOrderTotals(items) {

    // --------------------------------------------------------
    // Variables acumuladoras
    // --------------------------------------------------------
    let total = 0;
    let totalQuantity = 0;

    const calculatedItems = [];

    // --------------------------------------------------------
    // Algoritmo iterativo
    // Recorre cada producto una sola vez.
    // --------------------------------------------------------
    for (let i = 0; i < items.length; i += 1) {

        const item = items[i];

        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unit_price);

        // ----------------------------------------------------
        // Validar los valores de cada línea
        // ----------------------------------------------------
        if (
            !Number.isInteger(quantity) ||
            quantity <= 0 ||
            !Number.isFinite(unitPrice) ||
            unitPrice < 0
        ) {
            const error = new Error(
                'Invalid order item values.'
            );

            error.status = 400;
            error.publicMessage =
                'The order contains invalid product quantities or prices.';

            throw error;
        }

        // ----------------------------------------------------
        // Calcular subtotal de la línea
        // ----------------------------------------------------
        const lineTotal = Number(
            (quantity * unitPrice).toFixed(2)
        );

        // ----------------------------------------------------
        // Guardar línea con sus valores calculados
        // ----------------------------------------------------
        calculatedItems.push({
            ...item,
            quantity,
            unit_price: unitPrice,
            line_total: lineTotal
        });

        // ----------------------------------------------------
        // Acumular valores
        // ----------------------------------------------------
        total += lineTotal;
        totalQuantity += quantity;
    }

    // --------------------------------------------------------
    // Devolver los resultados
    // --------------------------------------------------------
    return {
        items: calculatedItems,
        total: Number(total.toFixed(2)),
        totalQuantity
    };
}

// ============================================================
// EXPORTAR FUNCIÓN
// ============================================================
module.exports = {
    calculateOrderTotals
};