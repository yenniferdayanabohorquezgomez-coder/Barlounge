
/**
 * Prepara los productos del inventario para los algoritmos.
 * Los valores monetarios se convierten a centavos.
 */
function prepareInventoryItems(items) {
    return items
        .map((item, index) => {
            const quantity = Math.max(
                0,
                Number(item.quantity || 0)
            );

            const purchasePrice = Math.max(
                0,
                Number(item.purchase_price || 0)
            );

            const salePrice = Math.max(
                0,
                Number(item.sale_price || 0)
            );

            const cost = Math.round(
                quantity * purchasePrice * 100
            );

            const potentialMargin = Math.round(
                quantity * (salePrice - purchasePrice) * 100
            );

            return {
                id: `${item.site_id}-${item.product_id}-${index}`,
                productCode: item.product_code,
                productName: item.product_name,
                siteName: item.site_name,
                quantity,
                cost,
                potentialMargin,
                ratio: cost > 0 ? potentialMargin / cost : 0
            };
        })
        .filter(item =>
            item.quantity > 0 &&
            item.cost > 0 &&
            item.potentialMargin > 0
        );
}

/**
 * ALGORITMO VORAZ (GREEDY)
 *
 * Selecciona los productos con mayor margen potencial
 * por cada peso invertido, siempre que quepan en el presupuesto.
 */
export function greedyInventoryPortfolio(items, budget) {
    const candidates = prepareInventoryItems(items);

    const availableBudget = Math.max(
        0,
        Math.round(Number(budget || 0) * 100)
    );

    candidates.sort((a, b) =>
        b.ratio - a.ratio ||
        b.potentialMargin - a.potentialMargin
    );

    let remainingBudget = availableBudget;
    let totalCost = 0;
    let totalMargin = 0;

    const selected = [];

    for (const item of candidates) {
        if (item.cost <= remainingBudget) {
            selected.push(item);

            remainingBudget -= item.cost;
            totalCost += item.cost;
            totalMargin += item.potentialMargin;
        }
    }

    return {
        selected,
        totalCost,
        totalMargin,
        remainingBudget,
        availableBudget
    };
}

/**
 * ALGORITMO MOCHILA 0/1
 * Técnica: Ramificación y Poda (Branch and Bound).
 *
 * Busca la combinación de productos que maximiza
 * el margen potencial sin superar el presupuesto.
 *
 * Cada producto se selecciona completo o no se selecciona.
 */
export function branchBoundKnapsack(items, budget) {
    const availableBudget = Math.max(
        0,
        Math.round(Number(budget || 0) * 100)
    );

    const MAX_ITEMS = 24;
    const MAX_NODES = 250000;

    const allCandidates = prepareInventoryItems(items);

    const candidates = [...allCandidates]
        .sort((a, b) => b.ratio - a.ratio)
        .slice(0, MAX_ITEMS);

    let bestValue = 0;
    let bestCost = 0;
    let bestSelection = [];

    let nodesVisited = 0;
    let limitReached = false;

    function calculateUpperBound(index, currentCost, currentValue) {
        let bound = currentValue;
        let remaining = availableBudget - currentCost;

        for (let i = index; i < candidates.length; i += 1) {
            const item = candidates[i];

            if (item.cost <= remaining) {
                bound += item.potentialMargin;
                remaining -= item.cost;
            } else {
                bound += item.potentialMargin *
                    (remaining / item.cost);
                break;
            }
        }

        return bound;
    }

    function search(index, currentCost, currentValue, selected) {
        nodesVisited += 1;

        if (nodesVisited >= MAX_NODES) {
            limitReached = true;
            return;
        }

        if (currentCost > availableBudget) return;

        if (currentValue > bestValue) {
            bestValue = currentValue;
            bestCost = currentCost;
            bestSelection = [...selected];
        }

        if (index >= candidates.length) return;

        const upperBound = calculateUpperBound(
            index,
            currentCost,
            currentValue
        );

        if (upperBound <= bestValue) return;

        const item = candidates[index];

        // Rama 1: incluir el producto.
        if (currentCost + item.cost <= availableBudget) {
            selected.push(item);

            search(
                index + 1,
                currentCost + item.cost,
                currentValue + item.potentialMargin,
                selected
            );

            selected.pop();
        }

        if (limitReached) return;

        // Rama 2: excluir el producto.
        search(
            index + 1,
            currentCost,
            currentValue,
            selected
        );
    }

    search(0, 0, 0, []);

    return {
        selected: bestSelection,
        totalCost: bestCost,
        totalMargin: bestValue,
        remainingBudget: availableBudget - bestCost,
        availableBudget,
        nodesVisited,
        analyzedItems: candidates.length,
        totalItems: allCandidates.length,
        limitReached,
        isOptimal:
            !limitReached &&
            allCandidates.length <= MAX_ITEMS
    };
}
