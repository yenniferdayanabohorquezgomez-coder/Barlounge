import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FormField from '../components/FormField';
import { getProduct, updateProduct } from '../services/productService';
import { getProductTypes } from '../services/productTypeService';
import { getSuppliers } from '../services/supplierService';
import { showFlash } from '../utils/flashMessage';

export default function EditProduct() {
    const {
        id
    } = useParams();
    const nav = useNavigate();
    const [f, setF] = useState(null);
    const [suppliers, setSuppliers] = useState([]);
    const [types, setTypes] = useState([]);
    const [error, setError] = useState('');
    useEffect(() => {
        Promise.all([getProduct(id), getSuppliers(), getProductTypes()]).then(([p, s, t]) => {
            setF({
                ...p,
                productTypeId: p.product_type_id,
                supplierId: p.supplier_id,
                purchaseUnit: p.purchase_unit,
                saleUnit: p.sale_unit,
                salePrice: p.sale_price
            });
            setSuppliers(s);
            setTypes(t);
        }).catch(e => setError(e.response?.data?.message || 'Unable to load product.'));
    }, [id]);
    if (!f) return <div className="panel">{error || 'Loading...'}</div>;
    const submit = async e => {
        e.preventDefault();
            try {
                await updateProduct(id, {
                    code: f.code,
                    name: f.name,
                    purchaseUnit: f.purchaseUnit,
                    saleUnit: f.saleUnit,
                    productTypeId: Number(f.productTypeId),
                    supplierId: Number(f.supplierId),
                    salePrice: Number(f.salePrice),
                    status: f.status
                });
                showFlash(
                    'success',
                    'Product updated successfully.'
                );
                nav('/products');
            } catch (err) {
                setError(err.response?.data?.message || 'Unable to update product.');
            }
    };
    return <div className="page"><div className="page-heading"><div><h1>Edit product</h1></div></div><form className="panel form-grid" onSubmit={submit}><FormField label="Product code"><input value={f.code} onChange={e => setF({
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
        })} required>{types.map(t => <option key={t.product_type_id} value={t.product_type_id}>{t.name}</option>)}</select></FormField><FormField label="Supplier"><select value={f.supplierId} onChange={e => setF({
            ...f,
            supplierId: e.target.value
        })} required>{suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>)}</select></FormField><FormField label="Sale price"><input type="number" min="0" step="0.01" value={f.salePrice} onChange={e => setF({
            ...f,
            salePrice: e.target.value
        })} required /></FormField><FormField label="Status"><select value={f.status} onChange={e => setF({
            ...f,
            status: e.target.value
        })}><option>ACTIVE</option><option>INACTIVE</option></select></FormField>{error && <div className="alert error full">{error}</div>}<div className="form-actions full"><button type="button" className="button ghost" onClick={() => nav('/products')}>Cancel</button><button className="button primary">Save changes</button></div></form></div>;
}