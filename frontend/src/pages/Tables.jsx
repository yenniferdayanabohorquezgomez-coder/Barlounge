
import { useEffect, useState } from 'react';
import {
    useLocation,
    useNavigate,
    useSearchParams
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { createOrder } from '../services/orderService';
import { getSites } from '../services/siteService';
import { getTables } from '../services/tableService';
import { showFlash } from '../utils/flashMessage';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function normalizeStatus(table) {
    return String(table?.status || '')
        .trim()
        .toUpperCase();
}

function normalizeTableList(response) {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.tables)) {
        return response.tables;
    }

    if (Array.isArray(response?.data)) {
        return response.data;
    }

    return null;
}

function getErrorMessage(error) {
    if (error.code === 'ECONNABORTED') {
        return 'The server took too long to respond.';
    }

    if (!error.response) {
        return 'No response received from the server. Please check that the backend is running.';
    }

    return (
        error.response.data?.message ||
        error.response.data?.error ||
        error.message ||
        'The operation could not be completed.'
    );
}

// ============================================================
// TABLES COMPONENT
// ============================================================

export default function Tables() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const requestedSiteId = searchParams.get('siteId') || '';

    const assignedSiteId = String(
        user?.siteId ?? user?.site_id ?? ''
    );

    const role = String(user?.role || '')
        .trim()
        .toLowerCase();

    const isAdmin = [
        'administrador',
        'administrator',
        'admin'
    ].includes(role);

    // ========================================================
    // STATE
    // ========================================================

    const [sites, setSites] = useState([]);

    const [siteId, setSiteId] = useState(
        requestedSiteId ||
        (isAdmin ? '' : assignedSiteId)
    );

    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingSites, setLoadingSites] = useState(isAdmin);

    const [busyTableId, setBusyTableId] = useState(null);
    const [selectedTable, setSelectedTable] = useState(null);
    const [error, setError] = useState('');

    // ========================================================
    // LOAD SITES
    // ========================================================

    useEffect(() => {
        if (!isAdmin) {
            setLoadingSites(false);
            return undefined;
        }

        let active = true;

        setLoadingSites(true);

        getSites()
            .then((response) => {
                if (!active) return;

                const data = Array.isArray(response)
                    ? response
                    : Array.isArray(response?.sites)
                        ? response.sites
                        : Array.isArray(response?.data)
                            ? response.data
                            : [];

                const activeSites = data.filter(
                    (site) =>
                        String(site.status || '')
                            .trim()
                            .toUpperCase() === 'ACTIVE'
                );

                setSites(activeSites);

                setSiteId((current) => {
                    if (
                        current &&
                        activeSites.some(
                            (site) =>
                                String(site.site_id) ===
                                String(current)
                        )
                    ) {
                        return current;
                    }

                    if (
                        requestedSiteId &&
                        activeSites.some(
                            (site) =>
                                String(site.site_id) ===
                                requestedSiteId
                        )
                    ) {
                        return requestedSiteId;
                    }

                    return activeSites.length > 0
                        ? String(activeSites[0].site_id)
                        : '';
                });
            })
            .catch((e) => {
                if (!active) return;

                console.error('Error loading sites:', e);
                setError(getErrorMessage(e));
            })
            .finally(() => {
                if (active) setLoadingSites(false);
            });

        return () => {
            active = false;
        };
    }, [isAdmin, requestedSiteId]);

    // ========================================================
    // LOAD TABLES WHEN ENTERING THE PAGE OR CHANGING SITES
    // ========================================================

    useEffect(() => {
        const effectiveSiteId = isAdmin
            ? String(siteId || '')
            : String(siteId || assignedSiteId);

        if (!effectiveSiteId) {
            setTables([]);
            setLoading(false);
            return undefined;
        }

        let active = true;

        setLoading(true);
        setError('');

        getTables(effectiveSiteId)
            .then((response) => {
                if (!active) return;

                const data = normalizeTableList(response);

                if (data === null) {
                    throw new Error(
                        'The server did not return a valid table list.'
                    );
                }

                console.debug(
                    '[BARLOUNGE] Tables received:',
                    data.length,
                    data
                );

                // This single list drives both the counters
                // and the rendered table cards.
                setTables(data);
            })
            .catch((e) => {
                if (!active) return;

                console.error('Error loading tables:', e);

                setError(getErrorMessage(e));
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [
        siteId,
        isAdmin,
        assignedSiteId,
        location.key
    ]);

    // ========================================================
    // TABLE COUNTERS
    // ========================================================

    const tableRows = Array.isArray(tables)
        ? tables
        : [];

    const totalTables = tableRows.length;

    const freeTables = tableRows.filter(
        (table) => normalizeStatus(table) === 'FREE'
    ).length;

    const occupiedTables = tableRows.filter(
        (table) => normalizeStatus(table) === 'OCCUPIED'
    ).length;

    const unavailableTables = tableRows.filter(
        (table) => normalizeStatus(table) === 'UNAVAILABLE'
    ).length;

    // ========================================================
    // REFRESH TABLES AFTER AN ERROR
    // ========================================================

    async function refreshTables() {
        const effectiveSiteId = isAdmin
            ? String(siteId || '')
            : String(siteId || assignedSiteId);

        if (!effectiveSiteId) {
            setTables([]);
            return;
        }

        const response = await getTables(effectiveSiteId);
        const data = normalizeTableList(response);

        if (data === null) {
            throw new Error(
                'The server did not return a valid table list.'
            );
        }

        setTables(data);
    }

    // ========================================================
    // SELECT A TABLE
    // ========================================================

    function handleTableAction(table) {
        setError('');

        const status = normalizeStatus(table);

        // Open an existing order for an occupied table.
        if (status === 'OCCUPIED' && table.order_id) {
            navigate(
                `/orders/${table.order_id}?siteId=${siteId}`
            );
            return;
        }

        // Only free tables can start a new order.
        if (status !== 'FREE') {
            setError(
                'This table is not available for a new order.'
            );
            return;
        }

        // Ask for confirmation before creating the order.
        setSelectedTable(table);
    }

    // ========================================================
    // CONFIRM AND CREATE ORDER
    // ========================================================

    async function handleConfirmStartOrder() {
        if (!selectedTable || busyTableId !== null) {
            return;
        }

        const table = selectedTable;

        setBusyTableId(table.table_id);
        setError('');

        try {
            const response = await createOrder(
                table.table_id,
                Number(siteId)
            );

            const order = response?.order || response;

            if (!order?.order_id) {
                throw new Error(
                    'The server did not return the order ID.'
                );
            }

            setSelectedTable(null);

            showFlash(
                'success',
                `Order #${order.order_id} created successfully.`
            );

            navigate(
                `/orders/${order.order_id}?siteId=${siteId}`
            );
        } catch (e) {
            console.error('Error creating order:', e);

            setError(getErrorMessage(e));
            setSelectedTable(null);

            // Refresh the table list without blocking the UI.
            refreshTables().catch((refreshError) => {
                console.error(
                    'Error refreshing tables:',
                    refreshError
                );
            });
        } finally {
            setBusyTableId(null);
        }
    }

    // ========================================================
    // USER INTERFACE
    // Keep this page in English and prevent browser translation
    // from modifying React-managed DOM nodes.
    // ========================================================

    return (
        <div
            className="page notranslate"
            translate="no"
        >
            {/* PAGE HEADING */}

            <div className="page-heading">
                <div>
                    <h1>Tables</h1>

                    <p>
                        Check table availability and manage open orders.
                    </p>
                </div>
            </div>

            {/* ERROR MESSAGE */}

            {error && (
                <div
                    className="alert error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            {/* SITE SELECTION */}

            <section className="panel tables-context">
                <div>
                    <strong>Site context</strong>

                    <p>
                        Select the site whose tables you want to view.
                    </p>
                </div>

                {isAdmin ? (
                    <div className="data-filter-field">
                        <label htmlFor="table-site">
                            Site
                        </label>

                        <select
                            id="table-site"
                            value={siteId}
                            disabled={loadingSites}
                            onChange={(e) => {
                                setSiteId(e.target.value);
                                setSelectedTable(null);
                                setError('');
                            }}
                        >
                            <option value="">
                                Select a site
                            </option>

                            {sites.map((site) => (
                                <option
                                    key={site.site_id}
                                    value={site.site_id}
                                >
                                    {site.code} · {site.name}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <span className="locked-site">
                        {user?.siteName || 'Assigned site'}
                    </span>
                )}
            </section>

            {/* TABLE COUNTERS */}

            <div
                className="tables-summary notranslate"
                translate="no"
            >
                <div className="table-summary-card">
                    <span>Total tables</span>
                    <strong>{totalTables}</strong>
                </div>

                <div className="table-summary-card free">
                    <span>Free</span>
                    <strong>{freeTables}</strong>
                </div>

                <div className="table-summary-card occupied">
                    <span>Occupied</span>
                    <strong>{occupiedTables}</strong>
                </div>

                {unavailableTables > 0 && (
                    <div className="table-summary-card unavailable">
                        <span>Unavailable</span>
                        <strong>{unavailableTables}</strong>
                    </div>
                )}
            </div>

            {/* LOADING AND EMPTY STATES */}

            {loading || loadingSites ? (
                <div className="panel loading">
                    Loading tables...
                </div>
            ) : !siteId ? (
                <div className="panel">
                    Select a site to view its tables.
                </div>
            ) : tableRows.length === 0 ? (
                <div className="panel">
                    No tables are registered for this site.
                </div>
            ) : (

                /* TABLE CARDS */

                <div
                    className="tables-grid notranslate"
                    translate="no"
                >
                    {tableRows.map((table) => {
                        const status = normalizeStatus(table);

                        const isFree = status === 'FREE';
                        const isOccupied = status === 'OCCUPIED';

                        const hasOrder = Boolean(table.order_id);

                        const isProcessing =
                            String(busyTableId) ===
                            String(table.table_id);

                        const disabled =
                            busyTableId !== null ||
                            status === 'UNAVAILABLE' ||
                            (isOccupied && !hasOrder);

                        let actionText = 'Unavailable';

                        if (isProcessing) {
                            actionText = 'Processing...';
                        } else if (isFree) {
                            actionText = 'Start order';
                        } else if (isOccupied && hasOrder) {
                            actionText = 'View order';
                        }

                        const statusLabel = isFree
                            ? 'Free'
                            : isOccupied
                                ? 'Occupied'
                                : 'Unavailable';

                        return (
                            <article
                                key={table.table_id}
                                className={
                                    `dining-table-card ${status.toLowerCase()}`
                                }
                            >
                                <div className="dining-table-top">
                                    <span className="dining-table-label">
                                        TABLE
                                    </span>

                                    <span
                                        className={
                                            `table-status ${status.toLowerCase()}`
                                        }
                                    >
                                        {statusLabel}
                                    </span>
                                </div>

                                <h2>
                                    Table {table.table_number}
                                </h2>

                                <p>
                                    {table.site || user?.siteName}
                                </p>

                                {isOccupied && hasOrder && (
                                    <p className="dining-order-reference">
                                        Open order #{table.order_id}
                                    </p>
                                )}

                                <button
                                    type="button"
                                    className={
                                        isFree
                                            ? 'button primary'
                                            : 'button ghost'
                                    }
                                    disabled={disabled}
                                    onClick={() =>
                                        handleTableAction(table)
                                    }
                                >
                                    {actionText}
                                </button>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* ORDER CONFIRMATION MODAL */}

            {selectedTable && (
                <div
                    className="table-confirm-backdrop notranslate"
                    translate="no"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                            setSelectedTable(null);
                        }
                    }}
                >
                    <div
                        className="table-confirm-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="table-confirm-title"
                    >
                        <span className="dining-table-label">
                            CONFIRMATION
                        </span>

                        <h2 id="table-confirm-title">
                            Start a new order?
                        </h2>

                        <p>
                            You are about to select table{' '}
                            <strong>
                                {selectedTable.table_number}
                            </strong>.
                        </p>

                        <p>
                            The table will become occupied after you
                            confirm and the order is created successfully.
                        </p>

                        <div className="table-confirm-actions">
                            <button
                                type="button"
                                className="button ghost"
                                disabled={busyTableId !== null}
                                onClick={() => setSelectedTable(null)}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="button primary"
                                disabled={busyTableId !== null}
                                onClick={handleConfirmStartOrder}
                            >
                                {busyTableId !== null
                                    ? 'Processing...'
                                    : 'Confirm and start'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
