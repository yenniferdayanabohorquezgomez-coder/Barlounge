import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getSuppliers } from '../services/supplierService';

export default function Suppliers() {

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
    // CARGAR PROVEEDORES
    // =========================================================

    useEffect(() => {

        getSuppliers()

            .then(setRows)

            .catch((e) => {

                setError(
                    e.response?.data?.message ||
                    'Unable to load suppliers.'
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
                    .map(supplier => supplier.status)
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

        return rows.filter((supplier) => {

            const matchesSearch =
                !text ||
                [
                    supplier.name,
                    supplier.contact,
                    supplier.status
                ]
                    .filter(Boolean)
                    .some(value =>
                        String(value)
                            .toLowerCase()
                            .includes(text)
                    );

            const matchesStatus =
                !statusFilter ||
                supplier.status === statusFilter;

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
                        Suppliers
                    </h1>

                    <p>
                        Supplier data linked to the product catalog.
                    </p>

                </div>

                <Link
                    className="button primary"
                    to="/suppliers/new"
                >
                    + New supplier
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
                        placeholder="Search by name, contact or status"
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
                {' '}suppliers

            </div>


            <div className="panel table-wrap">

                <table>

                    <thead>

                        <tr>

                            <th>
                                Name
                            </th>

                            <th>
                                Contact
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
                                    No suppliers match the selected filters.
                                </td>

                            </tr>

                        ) : (

                            filteredRows.map(supplier => (

                                <tr
                                    key={supplier.supplier_id}
                                >

                                    <td>
                                        {supplier.name}
                                    </td>

                                    <td>
                                        {supplier.contact || '—'}
                                    </td>

                                    <td>

                                        <span
                                            className={
                                                `status ${String(
                                                    supplier.status || ''
                                                ).toLowerCase()}`
                                            }
                                        >
                                            {supplier.status}
                                        </span>

                                    </td>

                                    <td>

                                        <Link
                                            className="table-link"
                                            to={`/suppliers/${supplier.supplier_id}/edit`}
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