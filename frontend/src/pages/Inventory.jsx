import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    getInventory,
    incrementInventory,
} from '../services/inventoryService';
import { getSites } from '../services/siteService';
import { showFlash } from '../utils/flashMessage';

export default function Inventory() {

    const { user } = useAuth();

    // =========================================================
    // ROL
    //=========================================================
    const isAdmin =
        user.role === 'Administrador';

    // =========================================================
    // DATOS
    // =========================================================
    const [sites, setSites] = useState([]);
    const [siteId, setSiteId] = useState(
        isAdmin
            ? ''
            : String(user.siteId)
    );
    const [rows, setRows] = useState([]);
    const [error, setError] = useState('');
    const [amounts, setAmounts] = useState({});

    // =========================================================
    // FILTROS
    // =========================================================
    const [search, setSearch] = useState('');
    const [stockFilter, setStockFilter] = useState('');

    // =========================================================
    // CARGAR INVENTARIO
    // =========================================================
    const load = () => {
        if (!siteId) {
            setRows([]);
            return;
        }
        getInventory(siteId)
            .then(setRows)
            .catch((e) => {
                setError(
                    e.response?.data?.message ||
                    'Unable to load inventory.'
                );
            });
    };

    // =========================================================
    // CARGAR SITIOS
    // =========================================================
    useEffect(() => {
        if (isAdmin) {
            getSites()
                .then(setSites)
                .catch(() => {
                    setError(
                        'Unable to load sites.'
                    );
                });
        }
    }, [isAdmin]);

    // =========================================================
    // RECARGAR INVENTARIO
    // =========================================================
    useEffect(() => {
        load();
    }, [siteId]);

    // =========================================================
    // INCREMENTAR INVENTARIO
    // =========================================================
    const inc = async (id) => {
        try {
            const amount =
                Number(
                    amounts[id]
                );
            await incrementInventory(
                id,
                amount,
                siteId
            );
            showFlash(
                'success',
                'Inventory quantity increased successfully.'
            );
            setAmounts({
                ...amounts,
                [id]: '',
            });
            load();
        } catch (e) {
            setError(
                e.response?.data?.message ||
                'Unable to increment inventory.'
            );
        }
    };

    // =========================================================
    // FILTRAR INVENTARIO
    // =========================================================

    const filteredRows = useMemo(() => {

        const text = search
            .trim()
            .toLowerCase();

        return rows.filter((item) => {

            const matchesSearch =
                !text ||
                [
                    item.code,
                    item.product,
                    item.sale_unit,
                    item.quantity
                ]
                    .filter(
                        value =>
                            value !== null &&
                            value !== undefined
                    )
                    .some(value =>
                        String(value)
                            .toLowerCase()
                            .includes(text)
                    );

            const quantity =
                Number(
                    item.quantity || 0
                );

            const matchesStock =
                !stockFilter ||

                (
                    stockFilter === 'in-stock' &&
                    quantity > 0
                ) ||

                (
                    stockFilter === 'out-of-stock' &&
                    quantity === 0
                );

            return (
                matchesSearch &&
                matchesStock
            );

        });

    }, [
        rows,
        search,
        stockFilter
    ]);

    // =========================================================
    // LIMPIAR FILTROS
    // =========================================================

    const clearFilters = () => {

        setSearch('');

        setStockFilter('');

    };

    // =========================================================
    // RENDER
    // =========================================================

    return (
        <div className="page">

            {/* =================================================
                ENCABEZADO
               ================================================= */}

            <div className="page-heading">

                <div>

                    <h1>
                        Inventory
                    </h1>

                    <p>
                        Quantities are maintained independently
                        for each site.
                    </p>

                </div>

            </div>


            {/* =================================================
                CONTEXTO DE SEDE
               ================================================= */}

            <div className="panel filterbar">

                <div>

                    <strong>
                        Site context
                    </strong>

                    <span>

                        {isAdmin
                            ? 'Administrator can choose the site.'
                            : 'CASHIER/role is restricted to the assigned site.'
                        }

                    </span>

                </div>


                {isAdmin ? (

                    <select
                        value={siteId}
                        onChange={(e) =>
                            setSiteId(
                                e.target.value
                            )
                        }
                    >

                        <option value="">
                            Select site
                        </option>

                        {sites.map(site => (

                            <option
                                key={site.site_id}
                                value={site.site_id}
                            >
                                {site.code} · {site.name}
                            </option>

                        ))}

                    </select>

                ) : (

                    <div className="locked-site">

                        {user.siteName}

                    </div>

                )}

            </div>


            {/* =================================================
                FILTROS DEL INVENTARIO
               ================================================= */}

            <div className="data-filter-panel">

                <div className="data-filter-field search-field">

                    <label>
                        Search
                    </label>

                    <input
                        type="text"
                        value={search}
                        onChange={e =>
                            setSearch(
                                e.target.value
                            )
                        }
                        placeholder="Search by code, product, unit or quantity"
                    />

                </div>


                <div className="data-filter-field">

                    <label>
                        Stock
                    </label>

                    <select
                        value={stockFilter}
                        onChange={e =>
                            setStockFilter(
                                e.target.value
                            )
                        }
                    >

                        <option value="">
                            All quantities
                        </option>

                        <option value="in-stock">
                            In stock
                        </option>

                        <option value="out-of-stock">
                            Out of stock
                        </option>

                    </select>

                </div>


                <button
                    type="button"
                    className="button ghost data-clear-filter"
                    onClick={clearFilters}
                >
                    Clear filters
                </button>

            </div>


            {/* =================================================
                ERROR
               ================================================= */}

            {error && (

                <div className="alert error">
                    {error}
                </div>

            )}


            {/* =================================================
                RESULTADOS
               ================================================= */}

            <div className="data-results">

                Showing{' '}
                <strong>
                    {filteredRows.length}
                </strong>
                {' '}of{' '}
                <strong>
                    {rows.length}
                </strong>
                {' '}inventory items

            </div>


            {/* =================================================
                TABLA
               ================================================= */}

            <div className="panel table-wrap">

                <table>

                    <thead>

                        <tr>

                            <th>
                                Code
                            </th>

                            <th>
                                Product
                            </th>

                            <th>
                                Unit
                            </th>

                            <th>
                                Quantity
                            </th>

                            <th>
                                Increment
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        {!siteId ? (

                            <tr>

                                <td
                                    colSpan="5"
                                    className="data-empty"
                                >
                                    Select a site to view inventory.
                                </td>

                            </tr>

                        ) : filteredRows.length === 0 ? (

                            <tr>

                                <td
                                    colSpan="5"
                                    className="data-empty"
                                >
                                    No inventory items match
                                    the selected filters.
                                </td>

                            </tr>

                        ) : (

                            filteredRows.map(item => (

                                <tr
                                    key={
                                        item.inventory_id
                                    }
                                >

                                    <td>
                                        {item.code}
                                    </td>

                                    <td>
                                        {item.product}
                                    </td>

                                    <td>
                                        {item.sale_unit}
                                    </td>

                                    <td>

                                        <strong>
                                            {item.quantity}
                                        </strong>

                                    </td>

                                    <td>

                                        <div className="inline-action">

                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={
                                                    amounts[
                                                        item.inventory_id
                                                    ] || ''
                                                }
                                                onChange={e =>
                                                    setAmounts({
                                                        ...amounts,
                                                        [item.inventory_id]:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder="+ units"
                                            />

                                            <button
                                                className="button small"
                                                onClick={() =>
                                                    inc(
                                                        item.inventory_id
                                                    )
                                                }
                                            >
                                                Add
                                            </button>

                                        </div>

                                    </td>

                                </tr>

                            ))

                        )}

                    </tbody>

                </table>

            </div>

        </div>
    );
}