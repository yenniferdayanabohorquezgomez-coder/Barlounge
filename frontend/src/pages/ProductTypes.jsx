import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getProductTypes } from '../services/productTypeService';

export default function ProductTypes() {

    // =========================================================
    // DATOS
    // =========================================================

    const [rows, setRows] = useState([]);

    const [error, setError] = useState('');

    // =========================================================
    // FILTROS
    // =========================================================

    const [search, setSearch] = useState('');

    const [statusFilter, setStatusFilter] = useState('');

    // =========================================================
    // CARGAR TIPOS
    // =========================================================

    useEffect(() => {

        getProductTypes()

            .then(setRows)

            .catch((e) => {

                setError(
                    e.response?.data?.message ||
                    'Unable to load product types.'
                );

            });

    }, []);

    // =========================================================
    // ESTADOS
    // =========================================================

    const statuses = useMemo(() => {

        return [
            ...new Set(
                rows
                    .map(type => type.status)
                    .filter(Boolean)
            )
        ].sort();

    }, [rows]);

    // =========================================================
    // FILTRAR
    // =========================================================

    const filteredRows = useMemo(() => {

        const text = search
            .trim()
            .toLowerCase();

        return rows.filter((type) => {

            const matchesSearch =
                !text ||
                [
                    type.name,
                    type.description,
                    type.status
                ]
                    .filter(Boolean)
                    .some(value =>
                        String(value)
                            .toLowerCase()
                            .includes(text)
                    );

            const matchesStatus =
                !statusFilter ||
                type.status === statusFilter;

            return (
                matchesSearch &&
                matchesStatus
            );

        });

    }, [
        rows,
        search,
        statusFilter
    ]);

    // =========================================================
    // LIMPIAR
    // =========================================================

    const clearFilters = () => {

        setSearch('');

        setStatusFilter('');

    };

    // =========================================================
    // RENDER
    // =========================================================

    return (
        <div className="page">

            <div className="page-heading">

                <div>

                    <h1>
                        Product types
                    </h1>

                    <p>
                        Classification for the global catalog.
                    </p>

                </div>

                <Link
                    className="button primary"
                    to="/product-types/new"
                >
                    + New product type
                </Link>

            </div>


            {error && (
                <div className="alert error">
                    {error}
                </div>
            )}


            {/* Filtros */}
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
                        placeholder="Search by name, description or status"
                    />

                </div>


                <div className="data-filter-field">

                    <label>
                        Status
                    </label>

                    <select
                        value={statusFilter}
                        onChange={e =>
                            setStatusFilter(
                                e.target.value
                            )
                        }
                    >

                        <option value="">
                            All statuses
                        </option>

                        {statuses.map(status => (

                            <option
                                key={status}
                                value={status}
                            >
                                {status}
                            </option>

                        ))}

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


            <div className="data-results">

                Showing{' '}
                <strong>
                    {filteredRows.length}
                </strong>
                {' '}of{' '}
                <strong>
                    {rows.length}
                </strong>
                {' '}product types

            </div>


            <div className="panel table-wrap">

                <table>

                    <thead>

                        <tr>

                            <th>
                                Name
                            </th>

                            <th>
                                Description
                            </th>

                            <th>
                                Status
                            </th>

                            <th></th>

                        </tr>

                    </thead>

                    <tbody>

                        {filteredRows.length === 0 ? (

                            <tr>

                                <td
                                    colSpan="4"
                                    className="data-empty"
                                >
                                    No product types match the selected filters.
                                </td>

                            </tr>

                        ) : (

                            filteredRows.map(type => (

                                <tr
                                    key={type.product_type_id}
                                >

                                    <td>
                                        {type.name}
                                    </td>

                                    <td>
                                        {type.description || '—'}
                                    </td>

                                    <td>

                                        <span
                                            className={
                                                `status ${String(
                                                    type.status || ''
                                                ).toLowerCase()}`
                                            }
                                        >
                                            {type.status}
                                        </span>

                                    </td>

                                    <td>

                                        <Link
                                            className="table-link"
                                            to={`/product-types/${type.product_type_id}/edit`}
                                        >
                                            Edit
                                        </Link>

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