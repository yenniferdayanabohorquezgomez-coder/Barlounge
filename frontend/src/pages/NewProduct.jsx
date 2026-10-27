
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import FormField from '../components/FormField';

import { createProduct } from '../services/productService';
import { getProductTypes } from '../services/productTypeService';
import { getSuppliers } from '../services/supplierService';
import { showFlash } from '../utils/flashMessage';

export default function NewProduct() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        code: '',
        name: '',
        purchaseUnit: 'unit',
        saleUnit: 'unit',
        purchasePrice: '',
        salePrice: '',
        productTypeId: '',
        supplierId: '',
        status: 'ACTIVE'
    });

    const [suppliers, setSuppliers] = useState([]);
    const [types, setTypes] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // ========================================================
    // LOAD FORM OPTIONS
    // ========================================================

    useEffect(() => {
        let active = true;

        Promise.all([
            getSuppliers(),
            getProductTypes()
        ])
            .then(([supplierData, typeData]) => {
                if (!active) return;

                setSuppliers(
                    Array.isArray(supplierData)
                        ? supplierData
                        : []
                );

                setTypes(
                    Array.isArray(typeData)
                        ? typeData
                        : []
                );
            })
            .catch((e) => {
                if (!active) return;

                console.error(
                    'Error loading product form options:',
                    e
                );

                setError(
                    e.response?.data?.message ||
                    'Unable to load suppliers and product types.'
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
    // FORM HANDLER
    // ========================================================

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value
        }));
    }

    // ========================================================
    // CREATE PRODUCT
    // ========================================================

    async function handleSubmit(event) {
        event.preventDefault();

        if (saving) return;

        const purchasePrice = Number(form.purchasePrice);
        const salePrice = Number(form.salePrice);

        if (
            form.purchasePrice === '' ||
            !Number.isFinite(purchasePrice) ||
            purchasePrice < 0
        ) {
            setError(
                'Enter a valid purchase price greater than or equal to zero.'
            );
            return;
        }

        if (
            form.salePrice === '' ||
            !Number.isFinite(salePrice) ||
            salePrice < 0
        ) {
            setError(
                'Enter a valid sale price greater than or equal to zero.'
            );
            return;
        }

        if (
            !Number.isInteger(Number(form.productTypeId)) ||
            Number(form.productTypeId) <= 0 ||
            !Number.isInteger(Number(form.supplierId)) ||
            Number(form.supplierId) <= 0
        ) {
            setError(
                'Select a valid product type and supplier.'
            );
            return;
        }

        setSaving(true);
        setError('');

        try {
            await createProduct({
                code: form.code.trim(),
                name: form.name.trim(),
                purchaseUnit: form.purchaseUnit.trim(),
                saleUnit: form.saleUnit.trim(),

                purchasePrice,
                salePrice,

                productTypeId: Number(form.productTypeId),
                supplierId: Number(form.supplierId),
                status: form.status
            });

            showFlash(
                'success',
                'Product created successfully.'
            );

            navigate('/products');
        } catch (e) {
            console.error('Error creating product:', e);

            setError(
                e.response?.data?.message ||
                'Unable to create product.'
            );
        } finally {
            setSaving(false);
        }
    }

    // ========================================================
    // RENDER
    // ========================================================

    if (loading) {
        return (
            <div className="page">
                <div className="panel">
                    Loading product form...
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-heading">
                <div>
                    <h1>New product</h1>

                    <p>
                        Add a product to the global catalog,
                        including its purchase and sale prices.
                    </p>
                </div>
            </div>

            {error && (
                <div className="alert error" role="alert">
                    {error}
                </div>
            )}

            <form
                className="panel form-grid"
                onSubmit={handleSubmit}
            >
                <FormField label="Product code">
                    <input
                        name="code"
                        value={form.code}
                        onChange={handleChange}
                        maxLength={30}
                        autoComplete="off"
                        required
                    />
                </FormField>

                <FormField label="Product name">
                    <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        maxLength={120}
                        required
                    />
                </FormField>

                <FormField label="Purchase unit">
                    <input
                        name="purchaseUnit"
                        value={form.purchaseUnit}
                        onChange={handleChange}
                        maxLength={50}
                        placeholder="e.g. box, bottle, package"
                        required
                    />
                </FormField>

                <FormField label="Sale unit">
                    <input
                        name="saleUnit"
                        value={form.saleUnit}
                        onChange={handleChange}
                        maxLength={50}
                        placeholder="e.g. unit, glass, serving"
                        required
                    />
                </FormField>

                <FormField label="Purchase price">
                    <input
                        type="number"
                        name="purchasePrice"
                        min="0"
                        step="0.01"
                        value={form.purchasePrice}
                        onChange={handleChange}
                        placeholder="0.00"
                        required
                    />
                </FormField>

                <FormField label="Sale price">
                    <input
                        type="number"
                        name="salePrice"
                        min="0"
                        step="0.01"
                        value={form.salePrice}
                        onChange={handleChange}
                        placeholder="0.00"
                        required
                    />
                </FormField>

                <FormField label="Product type">
                    <select
                        name="productTypeId"
                        value={form.productTypeId}
                        onChange={handleChange}
                        required
                    >
                        <option value="">
                            Select product type
                        </option>

                        {types.map((type) => (
                            <option
                                key={type.product_type_id}
                                value={type.product_type_id}
                            >
                                {type.name}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField label="Supplier">
                    <select
                        name="supplierId"
                        value={form.supplierId}
                        onChange={handleChange}
                        required
                    >
                        <option value="">
                            Select supplier
                        </option>

                        {suppliers.map((supplier) => (
                            <option
                                key={supplier.supplier_id}
                                value={supplier.supplier_id}
                            >
                                {supplier.name}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField label="Status">
                    <select
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                        required
                    >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                    </select>
                </FormField>

                <div className="form-actions full">
                    <button
                        type="button"
                        className="button ghost"
                        disabled={saving}
                        onClick={() => navigate('/products')}
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        className="button primary"
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save product'}
                    </button>
                </div>
            </form>
        </div>
    );
}
