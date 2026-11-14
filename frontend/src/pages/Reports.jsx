
import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react';

import * as XLSX from 'xlsx';

import { getSites } from '../services/siteService';

import {
    getInventoryReport,
    getSalesReport,
    getTopProductsReport
} from '../services/reportService';

import {
    branchBoundKnapsack,
    greedyInventoryPortfolio
} from '../utils/inventoryOptimization';

import { showFlash } from '../utils/flashMessage';

import '../styles/Reports.css';

// ============================================================
// FORMATOS
// ============================================================

const currency = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
});

const number = new Intl.NumberFormat('es-CO');

function formatMoney(value) {
    return currency.format(Number(value || 0));
}

function formatNumber(value) {
    return number.format(Number(value || 0));
}

function getLocalDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function getFirstDayOfMonth() {
    const today = new Date();

    return getLocalDate(
        new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        )
    );
}

// ============================================================
// EXPORTACIÓN A EXCEL
// ============================================================

function exportToExcel(tab, data, dates) {
    let rows = [];
    let sheetName = 'Report';

    if (tab === 'sales') {
        sheetName = 'Sales Report';

        rows = data.map(item => ({
            Date: item.requested_at,
            Invoice: item.invoice_number,
            Site: item.site_name,
            'Product code': item.product_code,
            Product: item.product_name,
            Quantity: Number(item.quantity),
            'Sale unit price': Number(item.unit_price),
            'Purchase unit price': Number(item.purchase_price),
            'Sales value': Number(item.line_total),
            'Purchase cost': Number(item.purchase_total),
            Profit: Number(item.profit)
        }));
    }

    if (tab === 'inventory') {
        sheetName = 'Inventory';

        rows = data.map(item => ({
            Site: item.site_name,
            'Product code': item.product_code,
            Product: item.product_name,
            'Purchase unit': item.purchase_unit,
            'Sale unit': item.sale_unit,
            Quantity: Number(item.quantity),
            'Purchase price': Number(item.purchase_price),
            'Sale price': Number(item.sale_price),
            'Inventory purchase value':
                Number(item.inventory_purchase_value),
            'Inventory sale value':
                Number(item.inventory_sale_value)
        }));
    }

    if (tab === 'top-products') {
        sheetName = 'Best Sellers';

        rows = data.map(item => ({
            'Product code': item.product_code,
            Product: item.product_name,
            'Units sold': Number(item.units_sold),
            Sales: Number(item.sales),
            Cost: Number(item.cost),
            Profit: Number(item.profit)
        }));
    }

    if (!rows.length) {
        showFlash(
            'error',
            'There is no information to export.'
        );
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet['!cols'] = Object.keys(rows[0]).map(key => ({
        wch: Math.max(
            key.length + 4,
            ...rows.slice(0, 100).map(row =>
                String(row[key] ?? '').length + 2
            )
        )
    }));

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        sheetName
    );

    const fileName =
        `barlounge-${tab}-${dates.startDate}-${dates.endDate}.xlsx`;

    XLSX.writeFile(workbook, fileName);

    showFlash(
        'success',
        'Excel report exported successfully.'
    );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function Reports() {
    // --------------------------------------------------------
    // DATA
    // --------------------------------------------------------

    const [sites, setSites] = useState([]);

    const [sales, setSales] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [topProducts, setTopProducts] = useState([]);

    const [salesSummary, setSalesSummary] = useState({
        units: 0,
        sales: 0,
        cost: 0,
        profit: 0
    });

    // --------------------------------------------------------
    // FILTERS
    // --------------------------------------------------------

    const [siteId, setSiteId] = useState('');

    const [startDate, setStartDate] = useState(
        getFirstDayOfMonth()
    );

    const [endDate, setEndDate] = useState(
        getLocalDate()
    );

    const [activeTab, setActiveTab] = useState('sales');

    // --------------------------------------------------------
    // UI STATES
    // --------------------------------------------------------

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    // Presupuesto hipotético para las simulaciones.
    const [optimizationBudget, setOptimizationBudget] =
        useState('500000');

    // --------------------------------------------------------
    // LOAD SITES
    // --------------------------------------------------------

    useEffect(() => {
        let active = true;

        getSites()
            .then(data => {
                if (active) {
                    setSites(
                        Array.isArray(data) ? data : []
                    );
                }
            })
            .catch(error => {
                if (active) {
                    console.error(
                        'Unable to load report sites:',
                        error
                    );
                }
            });

        return () => {
            active = false;
        };
    }, []);

    // --------------------------------------------------------
    // LOAD REPORTS
    // --------------------------------------------------------

    const loadReports = useCallback(async () => {
        if (!startDate || !endDate) {
            setError('Select both report dates.');
            return;
        }

        if (startDate > endDate) {
            setError(
                'The start date cannot be later than the end date.'
            );
            return;
        }

        setLoading(true);
        setError('');

        try {
            const filters = {
                startDate,
                endDate,
                ...(siteId ? { siteId } : {})
            };

            const inventoryFilters = siteId
                ? { siteId }
                : {};

            const [
                salesResponse,
                inventoryResponse,
                topResponse
            ] = await Promise.all([
                getSalesReport(filters),
                getInventoryReport(inventoryFilters),
                getTopProductsReport(filters)
            ]);

            const salesRows = Array.isArray(salesResponse.rows)
                ? salesResponse.rows
                : [];

            const inventoryRows =
                Array.isArray(inventoryResponse.rows)
                    ? inventoryResponse.rows
                    : [];

            const topRows = Array.isArray(topResponse.rows)
                ? topResponse.rows
                : [];

            setSales(salesRows);
            setInventory(inventoryRows);
            setTopProducts(topRows);

            setSalesSummary(
                salesResponse.summary || {
                    units: 0,
                    sales: 0,
                    cost: 0,
                    profit: 0
                }
            );
        } catch (error) {
            console.error(
                'Error loading reports:',
                error
            );

            setError(
                error.response?.data?.message ||
                'Unable to load reports.'
            );
        } finally {
            setLoading(false);
        }
    }, [
        startDate,
        endDate,
        siteId
    ]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    // --------------------------------------------------------
    // FILTER TABLE DATA
    // --------------------------------------------------------

    const currentRows = useMemo(() => {
        let rows = [];

        if (activeTab === 'sales') {
            rows = sales;
        }

        if (activeTab === 'inventory') {
            rows = inventory;
        }

        if (activeTab === 'top-products') {
            rows = topProducts;
        }

        const searchText = search.trim().toLowerCase();

        if (!searchText) {
            return rows;
        }

        return rows.filter(row =>
            Object.values(row).some(value =>
                String(value ?? '')
                    .toLowerCase()
                    .includes(searchText)
            )
        );
    }, [
        activeTab,
        sales,
        inventory,
        topProducts,
        search
    ]);

    // --------------------------------------------------------
    // INVENTORY SUMMARY
    // --------------------------------------------------------

    const inventorySummary = useMemo(() => {
        return inventory.reduce(
            (summary, item) => {
                summary.units += Number(item.quantity || 0);

                summary.purchaseValue += Number(
                    item.inventory_purchase_value || 0
                );

                summary.saleValue += Number(
                    item.inventory_sale_value || 0
                );

                return summary;
            },
            {
                units: 0,
                purchaseValue: 0,
                saleValue: 0
            }
        );
    }, [inventory]);

    // --------------------------------------------------------
    // INVENTORY OPTIMIZATION
    // --------------------------------------------------------

    const numericBudget = useMemo(() => {
        const parsed = Number(optimizationBudget);

        if (!Number.isFinite(parsed) || parsed < 0) {
            return 0;
        }

        return parsed;
    }, [optimizationBudget]);

    const greedyResult = useMemo(
        () => greedyInventoryPortfolio(
            inventory,
            numericBudget
        ),
        [inventory, numericBudget]
    );

    const knapsackResult = useMemo(
        () => branchBoundKnapsack(
            inventory,
            numericBudget
        ),
        [inventory, numericBudget]
    );

    // --------------------------------------------------------
    // EXPORT CURRENT REPORT
    // --------------------------------------------------------

    const handleExport = () => {
        exportToExcel(
            activeTab,
            currentRows,
            {
                startDate,
                endDate
            }
        );
    };

    // --------------------------------------------------------
    // CLEAR SEARCH
    // --------------------------------------------------------

    const clearSearch = () => {
        setSearch('');
    };

    // --------------------------------------------------------
    // OPTIMIZATION RESULT CARD
    // --------------------------------------------------------
    const renderOptimizationResult = (
        title,
        description,
        result,
        algorithmType
    ) => {
        const selectedItems = Array.isArray(result?.selected)
            ? result.selected
            : [];

        return (
            <article className="reports-optimization-card">

                <div className="reports-optimization-card-header">
                    <div>
                        <h3>{title}</h3>
                        <p>{description}</p>
                    </div>
                </div>

                {/* RESULTADOS GENERALES */}

                <div className="reports-optimization-metrics">
                    <div>
                        <span>Inversión potencial</span>
                        <strong>
                            {formatMoney(result.totalCost / 100)}
                        </strong>
                    </div>

                    <div>
                        <span>Margen bruto potencial</span>
                        <strong className="reports-optimization-profit">
                            {formatMoney(result.totalMargin / 100)}
                        </strong>
                    </div>

                    <div>
                        <span>Presupuesto restante</span>
                        <strong>
                            {formatMoney(result.remainingBudget / 100)}
                        </strong>
                    </div>

                    <div>
                        <span>Productos seleccionados</span>
                        <strong>
                            {formatNumber(selectedItems.length)}
                        </strong>
                    </div>
                </div>

                {/* PRODUCTOS ELEGIDOS */}

                <div className="reports-selected-products">
                    <h4>
                        {algorithmType === 'Greedy'
                            ? 'Productos elegidos por el algoritmo'
                            : 'Combinación de productos seleccionada'}
                    </h4>

                    <p className="reports-selected-description">
                        {algorithmType === 'Greedy'
                            ? 'Estos son los productos que el algoritmo fue seleccionando según su rentabilidad y el presupuesto disponible.'
                            : 'Esta es la combinación de productos que el algoritmo encontró para obtener el mayor margen posible sin superar el presupuesto.'}
                    </p>

                    {selectedItems.length === 0 ? (
                        <div className="reports-optimization-empty">
                            No se seleccionaron productos. Introduce un
                            presupuesto suficiente para realizar la simulación.
                        </div>
                    ) : (
                        <div className="reports-selected-list">
                            {selectedItems.map((item, index) => (
                                <div
                                    className="reports-selected-item"
                                    key={item.id || `${item.productCode}-${index}`}
                                >
                                    <div className="reports-selected-number">
                                        {index + 1}
                                    </div>

                                    <div className="reports-selected-info">
                                        <strong>
                                            {item.productName}
                                        </strong>

                                        <span>
                                            Código: {item.productCode || '—'}
                                            {' · '}
                                            Sede: {item.siteName || '—'}
                                        </span>

                                        <span>
                                            Cantidad disponible: {formatNumber(item.quantity)}
                                        </span>
                                    </div>

                                    <div className="reports-selected-values">
                                        <span>
                                            Inversión
                                        </span>

                                        <strong>
                                            {formatMoney(item.cost / 100)}
                                        </strong>

                                        <span>
                                            Margen potencial
                                        </span>

                                        <strong className="reports-optimization-profit">
                                            {formatMoney(item.potentialMargin / 100)}
                                        </strong>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ESTADO DE MOCHILA */}

                {algorithmType === 'Knapsack' && (
                    <div className="reports-optimization-status">
                        {result.isOptimal ? (
                            <span>
                                La búsqueda terminó y encontró la mejor
                                combinación entre los productos analizados.
                            </span>
                        ) : (
                            <span>
                                La búsqueda alcanzó un límite. Se muestra
                                la mejor combinación encontrada, pero no
                                se garantiza que sea la óptima global.
                            </span>
                        )}

                        <small>
                            Productos analizados: {formatNumber(result.analyzedItems)}
                            {' de '}
                            {formatNumber(result.totalItems)}
                            {' · '}
                            Nodos revisados: {formatNumber(result.nodesVisited)}
                        </small>
                    </div>
                )}

            </article>
        );
    };

    // --------------------------------------------------------
    // RENDER
    // --------------------------------------------------------

    return (
        <div className="page reports-page">

            {/* HEADER */}

            <div className="page-heading reports-heading">
                <div>
                    <h1>Reports</h1>

                    <p>
                        Analyze sales, inventory and product
                        performance.
                    </p>
                </div>

                <button
                    type="button"
                    className="button primary"
                    onClick={handleExport}
                    disabled={
                        loading ||
                        currentRows.length === 0
                    }
                >
                    <span>↓</span>
                    Export Excel
                </button>
            </div>

            {/* FILTERS */}

            <section className="panel reports-filters">
                <div className="reports-filter-title">
                    <div>
                        <h2>Report filters</h2>

                        <p>
                            Select the period and site to analyze.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="button ghost"
                        onClick={loadReports}
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Refresh reports'}
                    </button>
                </div>

                <div className="reports-filter-grid">
                    <div className="reports-field">
                        <label htmlFor="report-start-date">
                            Start date
                        </label>

                        <input
                            id="report-start-date"
                            type="date"
                            value={startDate}
                            max={endDate || undefined}
                            onChange={event =>
                                setStartDate(event.target.value)
                            }
                        />
                    </div>

                    <div className="reports-field">
                        <label htmlFor="report-end-date">
                            End date
                        </label>

                        <input
                            id="report-end-date"
                            type="date"
                            value={endDate}
                            min={startDate || undefined}
                            max={getLocalDate()}
                            onChange={event =>
                                setEndDate(event.target.value)
                            }
                        />
                    </div>

                    <div className="reports-field">
                        <label htmlFor="report-site">
                            Site
                        </label>

                        <select
                            id="report-site"
                            value={siteId}
                            onChange={event =>
                                setSiteId(event.target.value)
                            }
                        >
                            <option value="">
                                All sites
                            </option>

                            {sites.map(site => (
                                <option
                                    key={site.site_id}
                                    value={site.site_id}
                                >
                                    {site.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            {/* ERROR */}

            {error && (
                <div className="alert error">
                    {error}
                </div>
            )}

            {/* SALES SUMMARY */}

            <section className="reports-summary">
                <article className="reports-metric">
                    <span>Total sales</span>

                    <strong>
                        {formatMoney(salesSummary.sales)}
                    </strong>

                    <small>Selected period</small>
                </article>

                <article className="reports-metric">
                    <span>Purchase cost</span>

                    <strong>
                        {formatMoney(salesSummary.cost)}
                    </strong>

                    <small>Cost of sold products</small>
                </article>

                <article className="reports-metric">
                    <span>Profit</span>

                    <strong className="profit-value">
                        {formatMoney(salesSummary.profit)}
                    </strong>

                    <small>Sales minus purchase cost</small>
                </article>

                <article className="reports-metric">
                    <span>Units sold</span>

                    <strong>
                        {formatNumber(salesSummary.units)}
                    </strong>

                    <small>Selected period</small>
                </article>
            </section>

            {/* REPORT TABS */}

            <section className="panel reports-content">
                <div className="reports-tabs">
                    <button
                        type="button"
                        className={
                            activeTab === 'sales'
                                ? 'reports-tab active'
                                : 'reports-tab'
                        }
                        onClick={() => {
                            setActiveTab('sales');
                            setSearch('');
                        }}
                    >
                        Sales report
                    </button>

                    <button
                        type="button"
                        className={
                            activeTab === 'inventory'
                                ? 'reports-tab active'
                                : 'reports-tab'
                        }
                        onClick={() => {
                            setActiveTab('inventory');
                            setSearch('');
                        }}
                    >
                        Inventory by site
                    </button>

                    <button
                        type="button"
                        className={
                            activeTab === 'top-products'
                                ? 'reports-tab active'
                                : 'reports-tab'
                        }
                        onClick={() => {
                            setActiveTab('top-products');
                            setSearch('');
                        }}
                    >
                        Best-selling products
                    </button>
                </div>

                {/* TABLE HEADER */}

                <div className="reports-table-heading">
                    <div>
                        <h2>
                            {activeTab === 'sales' && 'Sales details'}
                            {activeTab === 'inventory' && 'Inventory details'}
                            {activeTab === 'top-products' && 'Product performance'}
                        </h2>

                        <p>
                            {currentRows.length} record(s)
                        </p>
                    </div>

                    <div className="reports-search">
                        <input
                            type="search"
                            value={search}
                            onChange={event =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search report..."
                        />

                        {search && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                aria-label="Clear search"
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>

                {/* LOADING AND TABLE */}

                {loading ? (
                    <div className="reports-empty">
                        Loading report information...
                    </div>
                ) : currentRows.length === 0 ? (
                    <div className="reports-empty">
                        No information is available for the selected
                        filters.
                    </div>
                ) : (
                    <div className="reports-table-wrap">
                        <table className="reports-table">

                            {/* SALES */}

                            {activeTab === 'sales' && (
                                <>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Invoice</th>
                                            <th>Site</th>
                                            <th>Product</th>
                                            <th>Qty.</th>
                                            <th>Sale price</th>
                                            <th>Purchase cost</th>
                                            <th>Profit</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {currentRows.map((item, index) => (
                                            <tr
                                                key={`${item.invoice_number}-${item.product_code}-${index}`}
                                            >
                                                <td>
                                                    {item.requested_at
                                                        ? String(item.requested_at).slice(0, 10)
                                                        : '—'}
                                                </td>

                                                <td>{item.invoice_number}</td>
                                                <td>{item.site_name}</td>

                                                <td>
                                                    <strong>{item.product_name}</strong>
                                                    <small>{item.product_code}</small>
                                                </td>

                                                <td>
                                                    {formatNumber(item.quantity)}
                                                </td>

                                                <td>
                                                    {formatMoney(item.unit_price)}
                                                </td>

                                                <td>
                                                    {formatMoney(item.purchase_total)}
                                                </td>

                                                <td className="reports-profit">
                                                    {formatMoney(item.profit)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}

                            {/* INVENTORY */}

                            {activeTab === 'inventory' && (
                                <>
                                    <thead>
                                        <tr>
                                            <th>Site</th>
                                            <th>Code</th>
                                            <th>Product</th>
                                            <th>Purchase unit</th>
                                            <th>Sale unit</th>
                                            <th>Quantity</th>
                                            <th>Purchase value</th>
                                            <th>Sale value</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {currentRows.map(item => (
                                            <tr
                                                key={`${item.site_id}-${item.product_id}`}
                                            >
                                                <td>{item.site_name}</td>
                                                <td>{item.product_code}</td>

                                                <td>
                                                    <strong>{item.product_name}</strong>
                                                </td>

                                                <td>{item.purchase_unit}</td>
                                                <td>{item.sale_unit}</td>

                                                <td>
                                                    {formatNumber(item.quantity)}
                                                </td>

                                                <td>
                                                    {formatMoney(item.inventory_purchase_value)}
                                                </td>

                                                <td>
                                                    {formatMoney(item.inventory_sale_value)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}

                            {/* TOP PRODUCTS */}

                            {activeTab === 'top-products' && (
                                <>
                                    <thead>
                                        <tr>
                                            <th>Position</th>
                                            <th>Code</th>
                                            <th>Product</th>
                                            <th>Units sold</th>
                                            <th>Sales</th>
                                            <th>Cost</th>
                                            <th>Profit</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {currentRows.map((item, index) => (
                                            <tr key={item.product_code}>
                                                <td>
                                                    <span className="reports-position">
                                                        {index + 1}
                                                    </span>
                                                </td>

                                                <td>{item.product_code}</td>

                                                <td>
                                                    <strong>{item.product_name}</strong>
                                                </td>

                                                <td>
                                                    {formatNumber(item.units_sold)}
                                                </td>

                                                <td>
                                                    {formatMoney(item.sales)}
                                                </td>

                                                <td>
                                                    {formatMoney(item.cost)}
                                                </td>

                                                <td className="reports-profit">
                                                    {formatMoney(item.profit)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}
                        </table>
                    </div>
                )}
            </section>

            {/* INVENTORY SUMMARY AND ALGORITHMS */}

            {activeTab === 'inventory' && (
                <>
                    <section className="reports-inventory-summary">
                        <div>
                            <span>Total inventory units</span>

                            <strong>
                                {formatNumber(inventorySummary.units)}
                            </strong>
                        </div>

                        <div>
                            <span>Purchase value</span>

                            <strong>
                                {formatMoney(inventorySummary.purchaseValue)}
                            </strong>
                        </div>

                        <div>
                            <span>Potential sale value</span>

                            <strong>
                                {formatMoney(inventorySummary.saleValue)}
                            </strong>
                        </div>
                    </section>

                    {/* COMPACT ALGORITHM SECTION */}

                    <section className="reports-optimization">
                        <div className="reports-optimization-heading">
                            <div>
                                <h2>
                                    Inventory optimization analysis
                                </h2>

                                <p>
                                    Compare two algorithms using the
                                    current inventory information.
                                </p>
                            </div>
                        </div>

                        <div className="reports-optimization-budget">
                            <div>
                                <label htmlFor="optimization-budget">
                                    Hypothetical investment budget (COP)
                                </label>

                                <p>
                                    Set the maximum amount for this
                                    read-only simulation.
                                </p>
                            </div>

                            <div className="reports-field">
                                <input
                                    id="optimization-budget"
                                    type="number"
                                    min="0"
                                    step="10000"
                                    value={optimizationBudget}
                                    onChange={event =>
                                        setOptimizationBudget(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Enter budget in COP"
                                />
                            </div>
                        </div>

                        <div className="reports-optimization-grid">
                            {renderOptimizationResult(
                                'Algoritmo Voraz',
                                'Selecciona los productos con mejor relación entre margen potencial y costo, respetando el presupuesto.',
                                greedyResult,
                                'Greedy'
                            )}

                            {renderOptimizationResult(
                                'Algoritmo de la Mochila',
                                'Busca la combinación de productos que genere el mayor margen potencial sin superar el presupuesto.',
                                knapsackResult,
                                'Knapsack'
                            )}
                        </div>

                        <p className="reports-optimization-note">
                            These results are simulations based on current
                            inventory values. They do not create purchases,
                            modify stock quantities or change inventory records.
                        </p>
                    </section>
                </>
            )}
        </div>
    );
}
