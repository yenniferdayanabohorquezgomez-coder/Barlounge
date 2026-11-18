
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    useLocation,
    useNavigate,
    useSearchParams
} from 'react-router-dom';
import '../styles/TablesManagement.css';

import { useAuth } from '../context/AuthContext';
import { createOrder } from '../services/orderService';
import { getSites } from '../services/siteService';
import { createTable, getTables } from '../services/tableService';
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
    if (Array.isArray(response)) return response;

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

    // --------------------------------------------------------
    // IDENTIFY USER ROLE
    // --------------------------------------------------------
    
    const rawRole =
        user?.role_name ??
        user?.role ??
        user?.roleName ??
        user?.rol ??
        '';

    const role = String(
        typeof rawRole === 'object'
            ? (
                rawRole?.name ||
                rawRole?.role_name ||
                ''
            )
            : rawRole
    )
        .trim()
        .toLowerCase();

    const isAdmin = [
        'administrador',
        'administrator',
        'admin'
    ].includes(role);

    // --------------------------------------------------------
    // STATE
    // --------------------------------------------------------

    const [sites, setSites] = useState([]);

    const [siteId, setSiteId] = useState(
        requestedSiteId || (isAdmin ? '' : assignedSiteId)
    );

    const [tables, setTables] = useState([]);

    const [loading, setLoading] = useState(false);
    const [loadingSites, setLoadingSites] = useState(isAdmin);

    const [showCreateTable, setShowCreateTable] = useState(false);
    const [newTableNumber, setNewTableNumber] = useState('');
    const [creatingTable, setCreatingTable] = useState(false);

    const [busyTableId, setBusyTableId] = useState(null);
    const [selectedTable, setSelectedTable] = useState(null);

    const [error, setError] = useState('');

    const tablesScrollerRef = useRef(null);

    const [canScrollTablesLeft, setCanScrollTablesLeft] =
        useState(false);

    const [canScrollTablesRight, setCanScrollTablesRight] =
        useState(false);

    // --------------------------------------------------------
    // TABLE SCROLL
    // --------------------------------------------------------

    const updateTablesScrollButtons = useCallback(() => {
        const element = tablesScrollerRef.current;

        if (!element) return;

        setCanScrollTablesLeft(element.scrollLeft > 2);

        setCanScrollTablesRight(
            element.scrollLeft + element.clientWidth <
            element.scrollWidth - 2
        );
    }, []);

    const scrollTables = (direction) => {
        const element = tablesScrollerRef.current;

        if (!element) return;

        element.scrollBy({
            left: direction * element.clientWidth * 0.8,
            behavior: 'smooth'
        });
    };

    useEffect(() => {
        const element = tablesScrollerRef.current;

        if (!element) return undefined;

        updateTablesScrollButtons();

        element.addEventListener(
            'scroll',
            updateTablesScrollButtons
        );

        const resizeObserver = new ResizeObserver(
            updateTablesScrollButtons
        );

        resizeObserver.observe(element);

        return () => {
            element.removeEventListener(
                'scroll',
                updateTablesScrollButtons
            );

            resizeObserver.disconnect();
        };
    }, [
        tables.length,
        loading,
        loadingSites,
        updateTablesScrollButtons
    ]);

    // --------------------------------------------------------
    // LOAD SITES
    // --------------------------------------------------------

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
                                String(requestedSiteId)
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

    // --------------------------------------------------------
    // LOAD TABLES
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // TABLE COUNTERS
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // CREATE TABLE
    // --------------------------------------------------------

    async function handleCreateTable(event) {
        event.preventDefault();

        const tableNumber = newTableNumber.trim();

        if (!siteId) {
            setError('Select a site before creating a table.');
            return;
        }

        if (!tableNumber || tableNumber.length > 10) {
            setError(
                'Enter a table number with a maximum of 10 characters.'
            );
            return;
        }

        setCreatingTable(true);
        setError('');

        try {
            await createTable(
                Number(siteId),
                tableNumber
            );

            const response = await getTables(siteId);

            const updatedTables = normalizeTableList(response);

            if (updatedTables === null) {
                throw new Error(
                    'The table was created, but the table list could not be refreshed.'
                );
            }

            setTables(updatedTables);
            setNewTableNumber('');
            setShowCreateTable(false);

            showFlash(
                'success',
                `Table ${tableNumber} created successfully.`
            );
        } catch (error) {
            console.error('Error creating table:', error);

            setError(getErrorMessage(error));
        } finally {
            setCreatingTable(false);
        }
    }

    // --------------------------------------------------------
    // REFRESH TABLES
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // SELECT TABLE
    // --------------------------------------------------------

    function handleTableAction(table) {
        setError('');

        const status = normalizeStatus(table);

        if (status === 'OCCUPIED' && table.order_id) {
            navigate(
                `/orders/${table.order_id}?siteId=${siteId}`
            );

            return;
        }

        if (status !== 'FREE') {
            setError(
                'This table is not available for a new order.'
            );

            return;
        }

        setSelectedTable(table);
    }

    // --------------------------------------------------------
    // CONFIRM AND CREATE ORDER
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // USER INTERFACE
    // --------------------------------------------------------

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

                {isAdmin && (
                    <button
                        type="button"
                        className="button primary"
                        disabled={
                            !siteId ||
                            loadingSites ||
                            creatingTable
                        }
                        onClick={() => {
                            setError('');
                            setShowCreateTable(true);
                        }}
                    >
                        + Create table
                    </button>
                )}
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

                <div className="tables-carousel">

                    <button
                        type="button"
                        className="carousel-arrow"
                        onClick={() => scrollTables(-1)}
                        disabled={!canScrollTablesLeft}
                        aria-label="Mesas anteriores"
                        title="Mesas anteriores"
                    >
                        ‹
                    </button>

                    <div
                        className="tables-grid notranslate"
                        translate="no"
                        ref={tablesScrollerRef}
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

                    <button
                        type="button"
                        className="carousel-arrow"
                        onClick={() => scrollTables(1)}
                        disabled={!canScrollTablesRight}
                        aria-label="Siguientes mesas"
                        title="Siguientes mesas"
                    >
                        ›
                    </button>
                </div>
            )}

            {/* CREATE TABLE MODAL */}

            {showCreateTable && (
                <div
                    className="table-confirm-backdrop notranslate"
                    translate="no"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !creatingTable
                        ) {
                            setShowCreateTable(false);
                        }
                    }}
                >
                    <form
                        className="table-confirm-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-table-title"
                        onSubmit={handleCreateTable}
                    >
                        <span className="dining-table-label">
                            NEW TABLE
                        </span>

                        <h2 id="create-table-title">
                            Create a table
                        </h2>

                        <p>
                            Site:{' '}
                            <strong>
                                {sites.find(
                                    (site) =>
                                        String(site.site_id) ===
                                        String(siteId)
                                )?.name ||
                                    user?.siteName ||
                                    'Assigned site'}
                            </strong>
                        </p>

                        <label
                            className="table-create-label"
                            htmlFor="new-table-number"
                        >
                            Table number
                        </label>

                        <input
                            id="new-table-number"
                            type="text"
                            value={newTableNumber}
                            onChange={(event) =>
                                setNewTableNumber(event.target.value)
                            }
                            maxLength={10}
                            placeholder="For example: 01"
                            required
                            autoFocus
                            disabled={creatingTable}
                        />

                        <p className="table-create-help">
                            The new table will be created with status Free.
                        </p>

                        <div className="table-confirm-actions">
                            <button
                                type="button"
                                className="button ghost"
                                disabled={creatingTable}
                                onClick={() =>
                                    setShowCreateTable(false)
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="button primary"
                                disabled={
                                    creatingTable ||
                                    !newTableNumber.trim()
                                }
                            >
                                {creatingTable
                                    ? 'Creating...'
                                    : 'Create table'}
                            </button>
                        </div>
                    </form>
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
                                onClick={() =>
                                    setSelectedTable(null)
                                }
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
