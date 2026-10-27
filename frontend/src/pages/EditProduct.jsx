
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import FormField from '../components/FormField';

import {
    getProduct,
    updateProduct
} from '../services/productService';

import { getProductTypes } from '../services/productTypeService';
import { getSuppliers } from '../services/supplierService';
import { showFlash } from '../utils/flashMessage';

export default function EditProduct() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState(null);

    const [suppliers, setSuppliers] = useState([]);
    const [types, setTypes] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // ========================================================
    // LOAD PRODUCT AND FORM OPTIONS
    // ========================================================

    useEffect(() => {
        let active = true;

        Promise.all([
            getProduct(id),
            getSuppliers(),
            getProductTypes()
        ])
            .then(([product, supplierData, typeData]) => {
                if (!active) return;

                if (!product) {
                    throw new Error('Product not found.');
                }

                setForm({
                    code: product.code || '',
                    name: product.name || '',

                    purchaseUnit: product.purchase_unit || '',
                    saleUnit: product.sale_unit || '',

                    // Database fields mapped to frontend state.
                    purchasePrice: String(
                        product.purchase_price ?? 0
                    ),

                    salePrice: String(
                        product.sale_price ?? 0
                    ),

                    productTypeId: String(
                        product.product_type_id ?? ''
                    ),

                    supplierId: String(
                        product.supplier_id ?? ''
                    ),

                    status: product.status || 'ACTIVE'
                });

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

                console.error('Error loading product:', e);

                setError(
                    e.response?.data?.message ||
                    e.message ||
                    'Unable to load product.'
                );
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [id]);

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
    // UPDATE PRODUCT
    // ========================================================

    async function handleSubmit(event) {
        event.preventDefault();

        if (!form || saving) return;

        const purchasePrice = Number(form.purchasePrice);
        const salePrice = Number(form.salePrice);

        if (
            form.purchasePrice === '' ||
            !Number.isFinite(purchasePrice) ||
            purchasePrice < 0
        ) {
            setError('Enter a valid purchase price.');
            return;
        }

        if (
            form.salePrice === '' ||
            !Number.isFinite(salePrice) ||
            salePrice < 0
        ) {
            setError('Enter a valid sale price.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            await updateProduct(id, {
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
                'Product updated successfully.'
            );

            navigate('/products');
        } catch (e) {
            console.error('Error updating product:', e);

            setError(
                e.response?.data?.message ||
                'Unable to update product.'
            );
        } finally {
            setSaving(false);
        }
    }

    // ========================================================
    // LOADING STATE
    // ========================================================

    if (loading) {
        return (
            <div className="page">
                <div className="panel">
                    Loading product...
                </div>
            </div>
        );
    }

    if (!form) {
        return (
            <div className="page">
                <div className="page-heading">
                    <h1>Edit product</h1>
                </div>

                <div className="alert error">
                    {error || 'Product not found.'}
                </div>

                <button
                    type="button"
                    className="button ghost"
                    onClick={() => navigate('/products')}
                >
                    Back to products
                </button>
            </div>
        );
    }

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div className="page">
            <div className="page-heading">
                <div>
                    <h1>Edit product</h1>

                    <p>
                        Update product information and pricing.
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
                        required
                    />
                </FormField>

                <FormField label="Sale unit">
                    <input
                        name="saleUnit"
                        value={form.saleUnit}
                        onChange={handleChange}
                        maxLength={50}
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
                        {saving ? 'Saving...' : 'Save changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}
