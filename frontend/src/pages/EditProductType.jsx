import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FormField from '../components/FormField';
import { getProductType, updateProductType } from '../services/productTypeService';
import { showFlash } from '../utils/flashMessage';

export default function EditProductType() {
    const {
        id
    } = useParams();
    const nav = useNavigate();
    const [f, setF] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        getProductType(id).then(setF).catch(e => setError(e.response?.data?.message || 'Unable to load product type.'));
    }, [id]);
    if (!f) return <div className="panel">{error || 'Loading...'}</div>;
    const submit = async e => {
        e.preventDefault();
        try {
            await updateProductType(id, f);
            showFlash(
                'success',
                'Product type updated successfully.'
            );
            nav('/product-types');
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to update product type.');
        }
    };
    return <div className="page"><div className="page-heading"><div><h1>Edit product type</h1></div></div><form className="panel form-grid" onSubmit={submit}><FormField label="Name"><input value={f.name} onChange={e => setF({
            ...f,
            name: e.target.value
        })} required /></FormField><FormField label="Description" required={false}><input value={f.description || ''} onChange={e => setF({
            ...f,
            description: e.target.value
        })} /></FormField><FormField label="Status"><select value={f.status} onChange={e => setF({
            ...f,
            status: e.target.value
        })}><option>ACTIVE</option><option>INACTIVE</option></select></FormField>{error && <div className="alert error full">{error}</div>}<div className="form-actions full"><button type="button" className="button ghost" onClick={() => nav('/product-types')}>Cancel</button><button className="button primary">Save changes</button></div></form></div>;
}