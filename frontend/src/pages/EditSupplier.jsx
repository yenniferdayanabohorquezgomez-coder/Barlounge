import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FormField from '../components/FormField';
import { getSupplier, updateSupplier } from '../services/supplierService';
import { showFlash } from '../utils/flashMessage';

export default function EditSupplier() {
    const {
        id
    } = useParams();
    const nav = useNavigate();
    const [f, setF] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        getSupplier(id).then(setF).catch(e => setError(e.response?.data?.message || 'Unable to load supplier.'));
    }, [id]);
    if (!f) return <div className="panel">{error || 'Loading...'}</div>;
    const submit = async e => {
        e.preventDefault();
        try {
            await updateSupplier(id, f);
            showFlash(
                'success',
                'Supplier updated successfully.'
            );
            nav('/suppliers');
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to update supplier.');
        }
    };
    return <div className="page"><div className="page-heading"><div><h1>Edit supplier</h1></div></div><form className="panel form-grid" onSubmit={submit}><FormField label="Name"><input value={f.name} onChange={e => setF({
            ...f,
            name: e.target.value
        })} required /></FormField><FormField label="Contact" required={false}><input value={f.contact || ''} onChange={e => setF({
            ...f,
            contact: e.target.value
        })} /></FormField><FormField label="Status"><select value={f.status} onChange={e => setF({
            ...f,
            status: e.target.value
        })}><option>ACTIVE</option><option>INACTIVE</option></select></FormField>{error && <div className="alert error full">{error}</div>}<div className="form-actions full"><button type="button" className="button ghost" onClick={() => nav('/suppliers')}>Cancel</button><button className="button primary">Save changes</button></div></form></div>;
}