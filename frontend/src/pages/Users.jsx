import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getUsers } from '../services/userService';

export default function Users() {

    // =========================================================
    // DATOS
    // =========================================================

    const [rows, setRows] = useState([]);

    const [error, setError] = useState('');

    // =========================================================
    // FILTROS
    // =========================================================

    const [search, setSearch] = useState('');

    const [roleFilter, setRoleFilter] = useState('');

    const [siteFilter, setSiteFilter] = useState('');

    const [statusFilter, setStatusFilter] = useState('');

    // =========================================================
    // CARGAR USUARIOS
    // =========================================================

    useEffect(() => {

        getUsers()

            .then(setRows)

            .catch((e) => {

                setError(
                    e.response?.data?.message ||
                    'Unable to load users.'
                );

            });

    }, []);

    // =========================================================
    // OBTENER ROLES ÚNICOS
    // =========================================================

    const roles = useMemo(() => {

        return [
            ...new Set(
                rows
                    .map(user => user.role)
                    .filter(Boolean)
            )
        ].sort();

    }, [rows]);

    // =========================================================
    // OBTENER SEDES ÚNICAS
    // =========================================================

    const sites = useMemo(() => {

        return [
            ...new Set(
                rows
                    .map(user => user.site)
                    .filter(Boolean)
            )
        ].sort();

    }, [rows]);

    // =========================================================
    // OBTENER ESTADOS ÚNICOS
    // =========================================================

    const statuses = useMemo(() => {

        return [
            ...new Set(
                rows
                    .map(user => user.status)
                    .filter(Boolean)
            )
        ].sort();

    }, [rows]);

    // =========================================================
    // FILTRAR USUARIOS
    // =========================================================

    const filteredRows = useMemo(() => {

        const text = search
            .trim()
            .toLowerCase();

        return rows.filter((user) => {

            // -------------------------------------------------
            // BÚSQUEDA GENERAL
            // Busca en TODOS los campos de la tabla.
            // -------------------------------------------------

            const matchesSearch =
                !text ||
                [
                    user.code,
                    user.name,
                    user.email,
                    user.role,
                    user.site,
                    user.status
                ]
                    .filter(Boolean)
                    .some(value =>
                        String(value)
                            .toLowerCase()
                            .includes(text)
                    );

            // -------------------------------------------------
            // FILTRO POR ROL
            // -------------------------------------------------

            const matchesRole =
                !roleFilter ||
                user.role === roleFilter;

            // -------------------------------------------------
            // FILTRO POR SEDE
            // -------------------------------------------------

            const matchesSite =
                !siteFilter ||
                user.site === siteFilter;

            // -------------------------------------------------
            // FILTRO POR ESTADO
            // -------------------------------------------------

            const matchesStatus =
                !statusFilter ||
                user.status === statusFilter;

            // -------------------------------------------------
            // TODOS LOS FILTROS DEBEN COINCIDIR
            // -------------------------------------------------

            return (
                matchesSearch &&
                matchesRole &&
                matchesSite &&
                matchesStatus
            );
        });

    }, [
        rows,
        search,
        roleFilter,
        siteFilter,
        statusFilter
    ]);

    // =========================================================
    // LIMPIAR FILTROS
    // =========================================================

    const clearFilters = () => {

        setSearch('');

        setRoleFilter('');

        setSiteFilter('');

        setStatusFilter('');

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
                        Users
                    </h1>

                    <p>
                        Control access by role, site and status.
                    </p>

                </div>

                <Link
                    className="button primary"
                    to="/users/new"
                >
                    + New user
                </Link>

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
                BARRA DE FILTROS
               ================================================= */}

            <div className="users-filter-panel">

                {/* =============================================
                    BÚSQUEDA GENERAL
                   ============================================= */}

                <div className="users-filter-field search-field">

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
                        placeholder="Search by code, name, email, role, site or status"
                    />

                </div>


                {/* =============================================
                    FILTRO DE ROL
                   ============================================= */}

                <div className="users-filter-field">

                    <label>
                        Role
                    </label>

                    <select
                        value={roleFilter}
                        onChange={e =>
                            setRoleFilter(
                                e.target.value
                            )
                        }
                    >

                        <option value="">
                            All roles
                        </option>

                        {roles.map(role => (

                            <option
                                key={role}
                                value={role}
                            >
                                {role}
                            </option>

                        ))}

                    </select>

                </div>


                {/* =============================================
                    FILTRO DE SEDE
                   ============================================= */}

                <div className="users-filter-field">

                    <label>
                        Site
                    </label>

                    <select
                        value={siteFilter}
                        onChange={e =>
                            setSiteFilter(
                                e.target.value
                            )
                        }
                    >

                        <option value="">
                            All sites
                        </option>

                        {sites.map(site => (

                            <option
                                key={site}
                                value={site}
                            >
                                {site}
                            </option>

                        ))}

                    </select>

                </div>


                {/* =============================================
                    FILTRO DE ESTADO
                   ============================================= */}

                <div className="users-filter-field">

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


                {/* =============================================
                    BOTÓN LIMPIAR
                   ============================================= */}

                <button
                    type="button"
                    className="button ghost users-clear-filter"
                    onClick={clearFilters}
                >
                    Clear filters
                </button>

            </div>


            {/* =================================================
                RESULTADO DEL FILTRO
               ================================================= */}

            <div className="users-results">

                Showing{' '}

                <strong>
                    {filteredRows.length}
                </strong>

                {' '}of{' '}

                <strong>
                    {rows.length}
                </strong>

                {' '}users

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
                                Name
                            </th>

                            <th>
                                Email
                            </th>

                            <th>
                                Role
                            </th>

                            <th>
                                Site
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
                                    colSpan="7"
                                    className="users-empty"
                                >
                                    No users match the selected filters.
                                </td>

                            </tr>

                        ) : (

                            filteredRows.map(user => (

                                <tr
                                    key={user.user_id}
                                >

                                    <td>
                                        {user.code}
                                    </td>

                                    <td>
                                        {user.name}
                                    </td>

                                    <td>
                                        {user.email || '—'}
                                    </td>

                                    <td>
                                        {user.role}
                                    </td>

                                    <td>
                                        {user.site}
                                    </td>

                                    <td>

                                        <span
                                            className={
                                                `status ${String(
                                                    user.status || ''
                                                ).toLowerCase()}`
                                            }
                                        >
                                            {user.status}
                                        </span>

                                    </td>

                                    <td>

                                        <Link
                                            className="table-link"
                                            to={`/users/${user.user_id}/edit`}
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