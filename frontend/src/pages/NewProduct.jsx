import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormField from '../components/FormField';
import { createProduct } from '../services/productService';
import { getProductTypes } from '../services/productTypeService';
import { getSuppliers } from '../services/supplierService';
import { showFlash } from '../utils/flashMessage';

export default function NewProduct() {
    const nav = useNavigate();
    const [f, setF] = useState({
        code: '',
        name: '',
        purchaseUnit: 'unit',
        saleUnit: 'unit',
        productTypeId: '',
        supplierId: '',
        salePrice: 0,
        status: 'ACTIVE'
    });
    const [suppliers, setSuppliers] = useState([]);
    const [types, setTypes] = useState([]);
    const [error, setError] = useState('');
    useEffect(() => {
        Promise.all([getSuppliers(), getProductTypes()]).then(([s, t]) => {
            setSuppliers(s);
            setTypes(t);
        }).catch(e => setError(e.response?.data?.message || 'Unable to load form data.'));
    }, []);
    const submit = async e => {
        e.preventDefault();
        try {
            await createProduct({
                ...f,
                productTypeId: Number(f.productTypeId),
                supplierId: Number(f.supplierId),
                salePrice: Number(f.salePrice)
            });
            showFlash(
                'success',
                'Product created successfully.'
            );
            nav('/products');
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to create product.');
        }
    };
    return <div className="page"><div className="page-heading"><div><h1>New product</h1></div></div><form className="panel form-grid" onSubmit={submit}><FormField label="Product code"><input value={f.code} onChange={e => setF({
            ...f,
            code: e.target.value
        })} required /></FormField><FormField label="Name"><input value={f.name} onChange={e => setF({
            ...f,
            name: e.target.value
        })} required /></FormField><FormField label="Purchase unit"><input value={f.purchaseUnit} onChange={e => setF({
            ...f,
            purchaseUnit: e.target.value
        })} required /></FormField><FormField label="Sale unit"><input value={f.saleUnit} onChange={e => setF({
            ...f,
            saleUnit: e.target.value
        })} required /></FormField><FormField label="Product type"><select value={f.productTypeId} onChange={e => setF({
            ...f,
            productTypeId: e.target.value
        })} required><option value="">Select type</option>{types.map(t => <option key={t.product_type_id} value={t.product_type_id}>{t.name}</option>)}</select></FormField><FormField label="Supplier"><select value={f.supplierId} onChange={e => setF({
            ...f,
            supplierId: e.target.value
        })} required><option value="">Select supplier</option>{suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>)}</select></FormField><FormField label="Sale price"><input type="number" min="0" step="0.01" value={f.salePrice} onChange={e => setF({
            ...f,
            salePrice: e.target.value
        })} required /></FormField><FormField label="Status"><select value={f.status} onChange={e => setF({
            ...f,
            status: e.target.value
        })}><option>ACTIVE</option><option>INACTIVE</option></select></FormField>{error && <div className="alert error full">{error}</div>}<div className="form-actions full"><button type="button" className="button ghost" onClick={() => nav('/products')}>Cancel</button><button className="button primary">Save product</button></div></form></div>;
}