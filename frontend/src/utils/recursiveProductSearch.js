// ============================================================
// ALGORITMO RECURSIVO - BÚSQUEDA BINARIA DE PRODUCTOS
// ============================================================

// Este algoritmo requiere que los productos estén ordenados
// previamente por su código.

export function recursiveProductSearch(
    sortedProducts,
    targetCode,
    left = 0,
    right = sortedProducts.length - 1
) {
    const target = String(targetCode || '')
        .trim()
        .toLowerCase();

    // Validar que exista un código para buscar.
    if (!target) {
        return null;
    }

    // CASO BASE:
    // El intervalo quedó vacío y no se encontró el producto.
    if (left > right) {
        return null;
    }

    // Calcular el punto medio del intervalo.
    const middle = Math.floor(
        (left + right) / 2
    );

    const currentCode = String(
        sortedProducts[middle]?.code || ''
    )
        .trim()
        .toLowerCase();

    // CASO BASE:
    // El producto fue encontrado.
    const comparison = target.localeCompare(currentCode);

    if (comparison === 0) {
        return sortedProducts[middle];
    }

    // Buscar recursivamente en la mitad izquierda.
    if (comparison < 0) {
        return recursiveProductSearch(
            sortedProducts,
            target,
            left,
            middle - 1
        );
    }

    // Buscar recursivamente en la mitad derecha.
    return recursiveProductSearch(
        sortedProducts,
        target,
        middle + 1,
        right
    );
}