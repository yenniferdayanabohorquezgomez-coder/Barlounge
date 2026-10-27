
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getProducts } from '../services/productService';
import { selectionSort } from '../utils/selectionSort';

function formatPrice(value) {
    return `$ ${Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

export default function Products() {
    const [rows, setRows] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // ========================================================
    // LOAD PRODUCTS
    // ========================================================

    useEffect(() => {
        let active = true;

        getProducts()
            .then((data) => {
                if (!active) return;

                const products = Array.isArray(data) ? data : [];

                setRows(
                    selectionSort(products, 'name')
                );
            })
            .catch((e) => {
                if (!active) return;

                console.error('Error loading products:', e);

                setError(
                    e.response?.data?.message ||
                    'Unable to load products.'
                );
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    // ========================================================
    // FILTER OPTIONS
    // ========================================================

    const productTypes = useMemo(
        () =>
            [
                ...new Set(
                    rows
                        .map((product) => product.product_type)
                        .filter(Boolean)
                )
            ].sort(),
        [rows]
    );

    const suppliers = useMemo(
        () =>
            [
                ...new Set(
                    rows
                        .map((product) => product.supplier)
                        .filter(Boolean)
                )
            ].sort(),
        [rows]
    );

    const statuses = useMemo(
        () =>
            [
                ...new Set(
                    rows
                        .map((product) => product.status)
                        .filter(Boolean)
                )
            ].sort(),
        [rows]
    );

    // ========================================================
    // SEARCH AND FILTER
    // ========================================================

    const filteredRows = useMemo(() => {
        const text = search.trim().toLowerCase();

        return rows.filter((product) => {
            const searchableValues = [
                product.code,
                product.name,
                product.product_type,
                product.supplier,
                product.purchase_unit,
                product.sale_unit,
                product.purchase_price,
                product.sale_price,
                product.status
            ];

            const matchesSearch =
                !text ||
                searchableValues
                    .filter(
                        (value) =>
                            value !== null &&
                            value !== undefined
                    )
                    .some((value) =>
                        String(value)
                            .toLowerCase()
                            .includes(text)
                    );

            const matchesType =
                !typeFilter ||
                product.product_type === typeFilter;

            const matchesSupplier =
                !supplierFilter ||
                product.supplier === supplierFilter;

            const matchesStatus =
                !statusFilter ||
                product.status === statusFilter;

            return (
                matchesSearch &&
                matchesType &&
                matchesSupplier &&
                matchesStatus
            );
        });
    }, [
        rows,
        search,
        typeFilter,
        supplierFilter,
        statusFilter
    ]);

    // ========================================================
    // CLEAR FILTERS
    // ========================================================

    function clearFilters() {
        setSearch('');
        setTypeFilter('');
        setSupplierFilter('');
        setStatusFilter('');
    }

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div className="page">
            <div className="page-heading">
                <div>
                    <h1>Products</h1>

                    <p>
                        Manage the global catalog, purchase prices
                        and sale prices. Inventory is managed per site.
                    </p>
                </div>

                <Link
                    className="button primary"
                    to="/products/new"
                >
                    + New product
                </Link>
            </div>

            {error && (
                <div className="alert error" role="alert">
                    {error}
                </div>
            )}

            {/* FILTERS */}

            <div className="data-filter-panel products-filter-panel">
                <div className="data-filter-field search-field">
                    <label htmlFor="product-search">
                        Search
                    </label>

                    <input
                        id="product-search"
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by code, name, type, supplier, unit or price"
                    />
                </div>

                <div className="data-filter-field">
                    <label htmlFor="product-type-filter">
                        Product type
                    </label>

                    <select
                        id="product-type-filter"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option value="">All types</option>

                        {productTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="data-filter-field">
                    <label htmlFor="product-supplier-filter">
                        Supplier
                    </label>

                    <select
                        id="product-supplier-filter"
                        value={supplierFilter}
                        onChange={(e) => setSupplierFilter(e.target.value)}
                    >
                        <option value="">All suppliers</option>

                        {suppliers.map((supplier) => (
                            <option key={supplier} value={supplier}>
                                {supplier}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="data-filter-field">
                    <label htmlFor="product-status-filter">
                        Status
                    </label>

                    <select
                        id="product-status-filter"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All statuses</option>

                        {statuses.map((status) => (
                            <option key={status} value={status}>
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

            {/* RESULTS COUNT */}

            <div className="data-results">
                Showing <strong>{filteredRows.length}</strong>
                {' '}of <strong>{rows.length}</strong> products
            </div>

            {/* PRODUCT CATALOG */}

            {loading ? (
                <div className="panel">
                    Loading products...
                </div>
            ) : (
                <div className="panel table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Supplier</th>
                                <th>Purchase unit</th>
                                <th>Sale unit</th>
                                <th>Purchase price</th>
                                <th>Sale price</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="10"
                                        className="data-empty"
                                    >
                                        No products match the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((product) => (
                                    <tr key={product.product_id}>
                                        <td>{product.code}</td>
                                        <td>{product.name}</td>
                                        <td>{product.product_type}</td>
                                        <td>{product.supplier}</td>
                                        <td>{product.purchase_unit}</td>
                                        <td>{product.sale_unit}</td>

                                        <td>
                                            {formatPrice(
                                                product.purchase_price
                                            )}
                                        </td>

                                        <td>
                                            {formatPrice(
                                                product.sale_price
                                            )}
                                        </td>

                                        <td>
                                            <span
                                                className={
                                                    `status ${String(
                                                        product.status || ''
                                                    ).toLowerCase()}`
                                                }
                                            >
                                                {product.status}
                                            </span>
                                        </td>

                                        <td>
                                            <Link
                                                className="table-link"
                                                to={`/products/${product.product_id}/edit`}
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
            )}
        </div>
    );
}
