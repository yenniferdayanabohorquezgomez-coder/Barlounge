import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getProducts } from '../services/productService';
import { selectionSort } from '../utils/selectionSort';

export default function Products() {

    // =========================================================
    // DATOS
    // =========================================================

    const [rows, setRows] = useState([]);

    const [error, setError] = useState('');

    // =========================================================
    // FILTROS
    // =========================================================

    const [search, setSearch] = useState('');

    const [typeFilter, setTypeFilter] = useState('');

    const [supplierFilter, setSupplierFilter] = useState('');

    const [statusFilter, setStatusFilter] = useState('');

    // =========================================================
    // CARGAR PRODUCTOS
    // =========================================================

    useEffect(() => {

        getProducts()

            .then(data => {

                // Se mantiene el Selection Sort
                // que ya utiliza BARLOUNGE.
                setRows(
                    selectionSort(
                        data,
                        'name'
                    )
                );

            })

            .catch((e) => {

                setError(
                    e.response?.data?.message ||
                    'Unable to load products.'
                );

            });

    }, []);

    // =========================================================
    // TIPOS
    // =========================================================

    const productTypes = useMemo(() => {

        return [
            ...new Set(
                rows
                    .map(product => product.product_type)
                    .filter(Boolean)
            )
        ].sort();

    }, [rows]);

    // =========================================================
    // PROVEEDORES
    // =========================================================

    const suppliers = useMemo(() => {

        return [
            ...new Set(
                rows
                    .map(product => product.supplier)
                    .filter(Boolean)
            )
        ].sort();

    }, [rows]);

    // =========================================================
    // ESTADOS
    // =========================================================

    const statuses = useMemo(() => {

        return [
            ...new Set(
                rows
                    .map(product => product.status)
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

        return rows.filter((product) => {

            const matchesSearch =
                !text ||
                [
                    product.code,
                    product.name,
                    product.product_type,
                    product.supplier,
                    product.purchase_unit,
                    product.sale_unit,
                    product.sale_price,
                    product.status
                ]
                    .filter(Boolean)
                    .some(value =>
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

    // =========================================================
    // LIMPIAR
    // =========================================================

    const clearFilters = () => {

        setSearch('');

        setTypeFilter('');

        setSupplierFilter('');

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
                        Products
                    </h1>

                    <p>
                        Global catalog and price; inventory remains per site.
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
                <div className="alert error">
                    {error}
                </div>
            )}

            {/* Filtros */}
            <div className="data-filter-panel products-filter-panel">
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
                        placeholder="Search by code, name, type, supplier, unit, price or status"
                    />

                </div>


                <div className="data-filter-field">

                    <label>
                        Product type
                    </label>

                    <select
                        value={typeFilter}
                        onChange={e =>
                            setTypeFilter(
                                e.target.value
                            )
                        }
                    >

                        <option value="">
                            All types
                        </option>

                        {productTypes.map(type => (

                            <option
                                key={type}
                                value={type}
                            >
                                {type}
                            </option>

                        ))}

                    </select>

                </div>


                <div className="data-filter-field">

                    <label>
                        Supplier
                    </label>

                    <select
                        value={supplierFilter}
                        onChange={e =>
                            setSupplierFilter(
                                e.target.value
                            )
                        }
                    >

                        <option value="">
                            All suppliers
                        </option>

                        {suppliers.map(supplier => (

                            <option
                                key={supplier}
                                value={supplier}
                            >
                                {supplier}
                            </option>

                        ))}

                    </select>

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
                {' '}products

            </div>


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
                            <th>Sale price</th>
                            <th>Status</th>
                            <th></th>

                        </tr>

                    </thead>

                    <tbody>

                        {filteredRows.length === 0 ? (

                            <tr>

                                <td
                                    colSpan="9"
                                    className="data-empty"
                                >
                                    No products match the selected filters.
                                </td>

                            </tr>

                        ) : (

                            filteredRows.map(product => (

                                <tr
                                    key={product.product_id}
                                >

                                    <td>
                                        {product.code}
                                    </td>

                                    <td>
                                        {product.name}
                                    </td>

                                    <td>
                                        {product.product_type}
                                    </td>

                                    <td>
                                        {product.supplier}
                                    </td>

                                    <td>
                                        {product.purchase_unit}
                                    </td>

                                    <td>
                                        {product.sale_unit}
                                    </td>

                                    <td>
                                        ${' '}
                                        {Number(
                                            product.sale_price
                                        ).toLocaleString(
                                            'en-US'
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

        </div>
    );
}