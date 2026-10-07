import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormField from '../components/FormField';
import { createProductType } from '../services/productTypeService';
import { showFlash } from '../utils/flashMessage';

export default function NewProductType() {
    const nav = useNavigate();
    const [f, setF] = useState({
        name: '',
        description: '',
        status: 'ACTIVE'
    });
    const [error, setError] = useState('');
    const submit = async e => {
        e.preventDefault();
        try {
            await createProductType(f);
            showFlash(
                'success',
                'Product type created successfully.'
            );
            nav('/product-types');
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to create product type.');
        }
    };
    return <div className="page"><div className="page-heading"><div><h1>New product type</h1></div></div><form className="panel form-grid" onSubmit={submit}><FormField label="Name"><input value={f.name} onChange={e => setF({
            ...f,
            name: e.target.value
        })} required /></FormField><FormField label="Description" required={false}><input value={f.description} onChange={e => setF({
            ...f,
            description: e.target.value
        })} /></FormField><FormField label="Status"><select value={f.status} onChange={e => setF({
            ...f,
            status: e.target.value
        })}><option>ACTIVE</option><option>INACTIVE</option></select></FormField>{error && <div className="alert error full">{error}</div>}<div className="form-actions full"><button type="button" className="button ghost" onClick={() => nav('/product-types')}>Cancel</button><button className="button primary">Save type</button></div></form></div>;
}
