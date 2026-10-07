import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormField from '../components/FormField';
import { createSupplier } from '../services/supplierService';
import { showFlash } from '../utils/flashMessage';

export default function NewSupplier() {
    const nav = useNavigate();
    const [f, setF] = useState({
        name: '',
        contact: '',
        status: 'ACTIVE'
    });
    const [error, setError] = useState('');
    const submit = async e => {
        e.preventDefault();
        try {
            await createSupplier(f);
            showFlash(
                'success',
                'Supplier created successfully.'
            );
            nav('/suppliers');
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to create supplier.');
        }
    };
    return <div className="page"><div className="page-heading"><div><h1>New supplier</h1></div></div><form className="panel form-grid" onSubmit={submit}><FormField label="Name"><input value={f.name} onChange={e => setF({
            ...f,
            name: e.target.value
        })} required /></FormField><FormField label="Contact" required={false}><input value={f.contact} onChange={e => setF({
            ...f,
            contact: e.target.value
        })} /></FormField><FormField label="Status"><select value={f.status} onChange={e => setF({
            ...f,
            status: e.target.value
        })}><option>ACTIVE</option><option>INACTIVE</option></select></FormField>{error && <div className="alert error full">{error}</div>}<div className="form-actions full"><button type="button" className="button ghost" onClick={() => nav('/suppliers')}>Cancel</button><button className="button primary">Save supplier</button></div></form></div>;
}