
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { getSites } from '../services/siteService';

import {
    assignProduct,
    getAssignableProducts,
    getProductAssignments,
    unassignProduct
} from '../services/inventoryService';

import { showFlash } from '../utils/flashMessage';

// ============================================================
// HELPERS
// ============================================================

function formatPrice(value) {
    return `$ ${Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function getErrorMessage(error) {
    return (
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'The operation could not be completed.'
    );
}

// ============================================================
// PRODUCT ASSIGNMENTS PAGE
// ============================================================

export default function ProductAssignments() {
    const [searchParams] = useSearchParams();

    const [sites, setSites] = useState([]);
    const [siteId, setSiteId] = useState(
        searchParams.get('siteId') || ''
    );

    const [assignments, setAssignments] = useState([]);
    const [availableProducts, setAvailableProducts] = useState([]);

    const [selectedProductId, setSelectedProductId] = useState('');

    const [loadingSites, setLoadingSites] = useState(true);
    const [loadingData, setLoadingData] = useState(false);

    const [assigning, setAssigning] = useState(false);
    const [removingId, setRemovingId] = useState(null);

    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    // ========================================================
    // LOAD SITES
    // ========================================================

    useEffect(() => {
        let active = true;

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
                            .toUpperCase() === 'ACTIVE'
                );

                setSites(activeSites);

                setSiteId((current) => {
                    if (
                        current &&
                        activeSites.some(
                            (site) =>
                                String(site.site_id) === String(current)
                        )
                    ) {
                        return current;
                    }

                    const requestedSite =
                        searchParams.get('siteId');

                    if (
                        requestedSite &&
                        activeSites.some(
                            (site) =>
                                String(site.site_id) === requestedSite
                        )
                    ) {
                        return requestedSite;
                    }

                    return activeSites.length
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
    }, [searchParams]);

    // ========================================================
    // LOAD CURRENT ASSIGNMENTS AND AVAILABLE PRODUCTS
    // ========================================================

    const loadData = useCallback(async () => {
        if (!siteId) {
            setAssignments([]);
            setAvailableProducts([]);
            return;
        }

        setLoadingData(true);
        setError('');

        try {
            const [
                assignmentResponse,
                availableResponse
            ] = await Promise.all([
                getProductAssignments(siteId),
                getAssignableProducts(siteId)
            ]);

            if (
                !Array.isArray(assignmentResponse) ||
                !Array.isArray(availableResponse)
            ) {
                throw new Error(
                    'The server returned an invalid product assignment response.'
                );
            }

            setAssignments(assignmentResponse);
            setAvailableProducts(availableResponse);

            setSelectedProductId((current) => {
                if (
                    current &&
                    availableResponse.some(
                        (product) =>
                            String(product.product_id) ===
                            String(current)
                    )
                ) {
                    return current;
                }

                return '';
            });
        } catch (e) {
            console.error('Error loading product assignments:', e);
            setError(getErrorMessage(e));
        } finally {
            setLoadingData(false);
        }
    }, [siteId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ========================================================
    // ASSIGN PRODUCT
    // ========================================================

    async function handleAssign() {
        if (!siteId || !selectedProductId || assigning) {
            return;
        }

        const productId = Number(selectedProductId);

        setAssigning(true);
        setError('');

        try {
            const response = await assignProduct(
                Number(siteId),
                productId
            );

            const assignment = response?.assignment;

            showFlash(
                'success',
                'Product assigned to the site successfully.'
            );

            setSelectedProductId('');

            // Remove it from the unassigned list immediately.
            setAvailableProducts((current) =>
                current.filter(
                    (product) =>
                        Number(product.product_id) !== productId
                )
            );

            if (assignment) {
                setAssignments((current) => [
                    ...current.filter(
                        (item) =>
                            Number(item.product_id) !== productId
                    ),
                    assignment
                ].sort((a, b) =>
                    String(a.product || a.name || '').localeCompare(
                        String(b.product || b.name || '')
                    )
                ));
            }

            // Refresh server data in the background.
            void loadData();
        } catch (e) {
            console.error('Error assigning product:', e);

            setError(getErrorMessage(e));
        } finally {
            setAssigning(false);
        }
    }

    // ========================================================
    // REMOVE ASSIGNMENT
    // ========================================================

    async function handleUnassign(item) {
        if (
            removingId !== null ||
            Number(item.quantity) > 0
        ) {
            return;
        }

        const confirmed = window.confirm(
            `Remove ${item.product || item.name} from this site?`
        );

        if (!confirmed) return;

        setRemovingId(item.inventory_id);
        setError('');

        try {
            await unassignProduct(
                item.inventory_id,
                siteId
            );

            // Remove the assignment from the screen immediately.
            setAssignments((current) =>
                current.filter(
                    (assignment) =>
                        Number(assignment.inventory_id) !==
                        Number(item.inventory_id)
                )
            );

            showFlash(
                'success',
                'Product assignment removed successfully.'
            );

            // Refresh both lists from the backend.
            void loadData();
        } catch (e) {
            console.error('Error removing assignment:', e);

            setError(getErrorMessage(e));
        } finally {
            setRemovingId(null);
        }
    }

    // ========================================================
    // FILTER ASSIGNMENTS
    // ========================================================

    const filteredAssignments = assignments.filter((item) => {
        const text = search.trim().toLowerCase();

        if (!text) return true;

        return [
            item.code,
            item.product,
            item.name,
            item.product_type,
            item.supplier
        ]
            .filter((value) => value !== null && value !== undefined)
            .some((value) =>
                String(value).toLowerCase().includes(text)
            );
    });

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div className="page">
            <div className="page-heading">
                <div>
                    <h1>Product Assignment</h1>

                    <p>
                        Choose which catalog products are available
                        at each site.
                    </p>
                </div>
            </div>

            {error && (
                <div className="alert error" role="alert">
                    {error}
                </div>
            )}

            {/* SITE SELECTION */}

            <section className="panel">
                <div className="data-filter-field">
                    <label htmlFor="assignment-site">
                        Site
                    </label>

                    <select
                        id="assignment-site"
                        value={siteId}
                        disabled={loadingSites || assigning || removingId !== null}
                        onChange={(e) => {
                            setSiteId(e.target.value);
                            setSearch('');
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
            </section>

            {/* ASSIGN A PRODUCT */}

            <section className="panel">
                <div className="page-heading">
                    <div>
                        <h2>Assign a product</h2>

                        <p>
                            Select an active catalog product to make it
                            available at the selected site.
                        </p>
                    </div>
                </div>

                <div className="assignment-form">
                    <div className="data-filter-field assignment-product-field">
                        <label htmlFor="assignment-product">
                            Product
                        </label>

                        <select
                            id="assignment-product"
                            value={selectedProductId}
                            disabled={
                                !siteId ||
                                loadingSites ||
                                loadingData ||
                                assigning ||
                                availableProducts.length === 0
                            }
                            onChange={(e) =>
                                setSelectedProductId(e.target.value)
                            }
                        >
                            <option value="">
                                Select a product
                            </option>

                            {availableProducts.map((product) => (
                                <option
                                    key={product.product_id}
                                    value={product.product_id}
                                >
                                    {product.code} · {product.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        className="button primary"
                        disabled={
                            !siteId ||
                            !selectedProductId ||
                            assigning ||
                            loadingData
                        }
                        onClick={handleAssign}
                    >
                        {assigning ? 'Assigning...' : 'Assign product'}
                    </button>
                </div>

                {siteId && !loadingData && availableProducts.length === 0 && (
                    <p className="assignment-hint">
                        All active catalog products are already assigned
                        to this site.
                    </p>
                )}

                <p className="assignment-hint">
                    Newly assigned products start with a quantity of zero.
                    Use Inventory to add stock.
                </p>
            </section>

            {/* CURRENT ASSIGNMENTS */}

            <section className="panel">
                <div className="page-heading">
                    <div>
                        <h2>Assigned products</h2>

                        <p>
                            Products currently available at the selected site.
                        </p>
                    </div>
                </div>

                <div className="data-filter-panel">
                    <div className="data-filter-field search-field">
                        <label htmlFor="assignment-search">
                            Search assigned products
                        </label>

                        <input
                            id="assignment-search"
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by code or product name"
                        />
                    </div>

                    <button
                        type="button"
                        className="button ghost data-clear-filter"
                        disabled={!search}
                        onClick={() => setSearch('')}
                    >
                        Clear search
                    </button>
                </div>

                <div className="data-results">
                    Showing <strong>{filteredAssignments.length}</strong>
                    {' '}of <strong>{assignments.length}</strong>
                    {' '}assigned products
                </div>

                {loadingSites || loadingData ? (
                    <div className="panel">
                        Loading product assignments...
                    </div>
                ) : !siteId ? (
                    <div className="data-empty">
                        Select a site to view product assignments.
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Product</th>
                                    <th>Purchase price</th>
                                    <th>Sale price</th>
                                    <th>Current quantity</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredAssignments.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="6"
                                            className="data-empty"
                                        >
                                            No assigned products match this search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAssignments.map((item) => (
                                        <tr key={item.inventory_id}>
                                            <td>{item.code}</td>
                                            <td>{item.product || item.name}</td>
                                            <td>
                                                {formatPrice(item.purchase_price)}
                                            </td>
                                            <td>
                                                {formatPrice(item.sale_price)}
                                            </td>
                                            <td>
                                                <strong>
                                                    {Number(item.quantity)}
                                                </strong>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="button ghost small"
                                                    disabled={
                                                        Number(item.quantity) > 0 ||
                                                        removingId !== null ||
                                                        assigning
                                                    }
                                                    onClick={() =>
                                                        handleUnassign(item)
                                                    }
                                                    title={
                                                        Number(item.quantity) > 0
                                                            ? 'Only zero-stock assignments can be removed.'
                                                            : 'Remove assignment'
                                                    }
                                                >
                                                    {removingId === item.inventory_id
                                                        ? 'Removing...'
                                                        : 'Remove'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
