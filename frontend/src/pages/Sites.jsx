import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getSites } from '../services/siteService';

export default function Sites() {

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
    // CARGAR SITIOS
    // =========================================================

    useEffect(() => {

        getSites()

            .then(setRows)

            .catch((e) => {

                setError(
                    e.response?.data?.message ||
                    'Unable to load sites.'
                );

            });

    }, []);

    // =========================================================
    // ESTADOS DISPONIBLES
    // =========================================================

    const statuses = useMemo(() => {

        return [
            ...new Set(
                rows
                    .map(site => site.status)
                    .filter(Boolean)
            )
        ].sort();

    }, [rows]);

    // =========================================================
    // FILTRAR SITIOS
    // =========================================================

    const filteredRows = useMemo(() => {

        const text = search
            .trim()
            .toLowerCase();

        return rows.filter((site) => {

            const matchesSearch =
                !text ||
                [
                    site.code,
                    site.name,
                    site.address,
                    site.status
                ]
                    .filter(Boolean)
                    .some(value =>
                        String(value)
                            .toLowerCase()
                            .includes(text)
                    );

            const matchesStatus =
                !statusFilter ||
                site.status === statusFilter;

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

            {/* Encabezado */}
            <div className="page-heading">

                <div>

                    <h1>
                        Sites
                    </h1>

                    <p>
                        Each site owns an independent inventory context.
                    </p>

                </div>

                <Link
                    className="button primary"
                    to="/sites/new"
                >
                    + New site
                </Link>

            </div>


            {/* Error */}
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
                        placeholder="Search by code, name, address or status"
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


            {/* Resultado */}
            <div className="data-results">

                Showing{' '}
                <strong>
                    {filteredRows.length}
                </strong>
                {' '}of{' '}
                <strong>
                    {rows.length}
                </strong>
                {' '}sites

            </div>


            {/* Tabla */}
            <div className="panel table-wrap">

                <table>

                    <thead>

                        <tr>

                            <th>Code</th>
                            <th>Name</th>
                            <th>Address</th>
                            <th>Status</th>
                            <th></th>

                        </tr>

                    </thead>

                    <tbody>

                        {filteredRows.length === 0 ? (

                            <tr>

                                <td
                                    colSpan="5"
                                    className="data-empty"
                                >
                                    No sites match the selected filters.
                                </td>

                            </tr>

                        ) : (

                            filteredRows.map(site => (

                                <tr
                                    key={site.site_id}
                                >

                                    <td>
                                        {site.code}
                                    </td>

                                    <td>
                                        {site.name}
                                    </td>

                                    <td>
                                        {site.address}
                                    </td>

                                    <td>

                                        <span
                                            className={
                                                `status ${String(
                                                    site.status || ''
                                                ).toLowerCase()}`
                                            }
                                        >
                                            {site.status}
                                        </span>

                                    </td>

                                    <td>

                                        <Link
                                            className="table-link"
                                            to={`/sites/${site.site_id}/edit`}
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