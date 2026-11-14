import {
    useCallback,
    useEffect,
    useState
} from 'react';

import { getAuditLogs } from '../services/auditService';

import '../styles/AuditLogs.css';

function localDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function firstDayOfMonth() {
    const today = new Date();

    return localDate(
        new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        )
    );
}

function formatDate(value) {
    if (!value) return '—';

    const date = new Date(
        String(value).replace(' ', 'T')
    );

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

function readable(value) {
    if (!value) return '—';

    return String(value)
        .replaceAll('_', ' ')
        .toLowerCase()
        .replace(/\b\w/g, letter =>
            letter.toUpperCase()
        );
}

function resultClass(result) {
    const value = String(result || '').toUpperCase();

    if (
        ['SUCCESS', 'COMPLETED', 'OK'].includes(value)
    ) {
        return 'audit-status success';
    }

    if (
        ['FAILED', 'ERROR', 'REJECTED'].includes(value)
    ) {
        return 'audit-status failed';
    }

    return 'audit-status neutral';
}

export default function AuditLogs() {
    const [rows, setRows] = useState([]);

    const [startDate, setStartDate] = useState(
        firstDayOfMonth()
    );

    const [endDate, setEndDate] = useState(
        localDate()
    );

    const [search, setSearch] = useState('');

    const [appliedFilters, setAppliedFilters] = useState({
        startDate: firstDayOfMonth(),
        endDate: localDate(),
        search: ''
    });

    const [page, setPage] = useState(1);

    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 0,
        pageSize: 20
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const result = await getAuditLogs({
                ...appliedFilters,
                page,
                pageSize: 20
            });

            setRows(
                Array.isArray(result.rows)
                    ? result.rows
                    : []
            );

            setPagination({
                total: Number(result.total || 0),
                totalPages: Number(result.totalPages || 0),
                pageSize: Number(result.pageSize || 20)
            });
                } catch (e) {
                    console.error(
                        'Audit log loading failed:',
                        e
                    );

                    if (e.code === 'ECONNABORTED') {
                        setError(
                            'The server took too long to respond. Check the backend.'
                        );
                    } else if (!e.response) {
                        setError(
                            'Cannot connect to the backend. Verify that the server is running.'
                        );
                    } else if (e.response.status === 401) {
                        setError(
                            'Your session has expired. Please sign in again.'
                        );
                    } else if (e.response.status === 403) {
                        setError(
                            'You do not have permission to view audit history. Check AUDIT_READ.'
                        );
                    } else if (e.response.status === 404) {
                        setError(
                            'The audit endpoint was not found. Check the backend route.'
                        );
                    } else {
                        setError(
                            e.response?.data?.message ||
                            'Unable to load audit history.'
                        );
                    }

                    setRows([]);

                    setPagination({
                        total: 0,
                        totalPages: 0,
                        pageSize: 20
                    });

                } finally {
                    setLoading(false);
                }
    }, [
        appliedFilters,
        page
    ]);

    useEffect(() => {
        load();
    }, [load]);

    function applyFilters(event) {
        event.preventDefault();

        if (
            startDate &&
            endDate &&
            startDate > endDate
        ) {
            setError(
                'The start date cannot be later than the end date.'
            );
            return;
        }

        setPage(1);

        setAppliedFilters({
            startDate,
            endDate,
            search: search.trim()
        });
    }

    function clearFilters() {
        const start = firstDayOfMonth();
        const end = localDate();

        setStartDate(start);
        setEndDate(end);
        setSearch('');
        setPage(1);

        setAppliedFilters({
            startDate: start,
            endDate: end,
            search: ''
        });
    }

    return (
        <div className="page audit-page">

            {/* HEADER */}
            <div className="page-heading">
                <div>
                    <h1>Audit logs</h1>

                    <p>
                        Review the actions performed in the system.
                    </p>
                </div>

                <button
                    type="button"
                    className="button ghost"
                    onClick={load}
                    disabled={loading}
                >
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {/* SUMMARY */}
            <section className="audit-summary">
                <div className="audit-summary-card">
                    <span>Total records</span>

                    <strong>
                        {pagination.total.toLocaleString('es-CO')}
                    </strong>

                    <small>
                        Matching the selected filters
                    </small>
                </div>

                <div className="audit-summary-card">
                    <span>Current page</span>

                    <strong>{page}</strong>

                    <small>
                        Of {pagination.totalPages} page(s)
                    </small>
                </div>

                <div className="audit-summary-card">
                    <span>Records per page</span>

                    <strong>{pagination.pageSize}</strong>

                    <small>
                        Maximum 100 per request
                    </small>
                </div>
            </section>

            {/* FILTERS */}
            <form
                className="panel audit-filters"
                onSubmit={applyFilters}
            >
                <div className="audit-section-heading">
                    <div>
                        <h2>Search history</h2>

                        <p>
                            Filter by date, user, action or module.
                        </p>
                    </div>
                </div>

                <div className="audit-filter-grid">

                    <div className="audit-field">
                        <label htmlFor="audit-start">
                            Start date
                        </label>

                        <input
                            id="audit-start"
                            type="date"
                            value={startDate}
                            max={endDate || undefined}
                            onChange={event =>
                                setStartDate(event.target.value)
                            }
                        />
                    </div>

                    <div className="audit-field">
                        <label htmlFor="audit-end">
                            End date
                        </label>

                        <input
                            id="audit-end"
                            type="date"
                            value={endDate}
                            min={startDate || undefined}
                            max={localDate()}
                            onChange={event =>
                                setEndDate(event.target.value)
                            }
                        />
                    </div>

                    <div className="audit-field audit-search-field">
                        <label htmlFor="audit-search">
                            Search
                        </label>

                        <input
                            id="audit-search"
                            type="search"
                            value={search}
                            onChange={event =>
                                setSearch(event.target.value)
                            }
                            placeholder="User, action, module, result..."
                            maxLength={100}
                        />
                    </div>

                </div>

                <div className="audit-filter-actions">
                    <button
                        type="button"
                        className="button ghost"
                        onClick={clearFilters}
                    >
                        Clear filters
                    </button>

                    <button
                        type="submit"
                        className="button primary"
                    >
                        Apply filters
                    </button>
                </div>
            </form>

            {/* ERROR */}
            {error && (
                <div className="alert error">
                    {error}
                </div>
            )}

            {/* TABLE */}
            <section className="panel audit-table-panel">

                <div className="audit-section-heading">
                    <div>
                        <h2>System activity</h2>

                        <p>
                            Latest recorded operations appear first.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="audit-empty">
                        Loading audit history...
                    </div>
                ) : rows.length === 0 ? (
                    <div className="audit-empty">
                        No audit records match the selected filters.
                    </div>
                ) : (
                    <div className="audit-table-wrapper">

                        <table className="audit-table">

                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Date and time</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Module</th>
                                    <th>Record ID</th>
                                    <th>Result</th>
                                </tr>
                            </thead>

                            <tbody>
                                {rows.map(row => (
                                    <tr key={row.audit_id}>
                                        <td>
                                            #{row.audit_id}
                                        </td>

                                        <td>
                                            {formatDate(row.created_at)}
                                        </td>

                                        <td>
                                            <strong>
                                                {row.user_name}
                                            </strong>

                                            <small>
                                                {row.user_code || 'System'}
                                            </small>
                                        </td>

                                        <td>
                                            <span className="audit-action">
                                                {readable(row.action)}
                                            </span>
                                        </td>

                                        <td>
                                            {readable(row.entity)}
                                        </td>

                                        <td>
                                            {row.entity_id ?? '—'}
                                        </td>

                                        <td>
                                            <span className={resultClass(row.result)}>
                                                {readable(row.result)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                        </table>

                    </div>
                )}

                {/* PAGINATION */}
                <div className="audit-pagination">

                    <span>
                        Showing {rows.length} of{' '}
                        {pagination.total.toLocaleString('es-CO')} records
                    </span>

                    <div className="audit-pagination-controls">

                        <button
                            type="button"
                            className="button ghost small"
                            disabled={page <= 1 || loading}
                            onClick={() =>
                                setPage(current => current - 1)
                            }
                        >
                            Previous
                        </button>

                        <span>
                            Page {page} / {Math.max(1, pagination.totalPages)}
                        </span>

                        <button
                            type="button"
                            className="button ghost small"
                            disabled={
                                page >= pagination.totalPages ||
                                loading
                            }
                            onClick={() =>
                                setPage(current => current + 1)
                            }
                        >
                            Next
                        </button>

                    </div>
                </div>

            </section>

        </div>
    );
}