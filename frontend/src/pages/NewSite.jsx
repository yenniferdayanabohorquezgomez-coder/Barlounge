import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormField from '../components/FormField';
import { createSite } from '../services/siteService';
import { showFlash } from '../utils/flashMessage';

export default function NewSite() {
    const nav = useNavigate();
    const [f, setF] = useState({
        code: '',
        name: '',
        address: '',
        status: 'ACTIVE'
    });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const submit = async e => {
        e.preventDefault();
        setSaving(true);
        try {
            await createSite(f);
            showFlash(
                'success',
                'Site created successfully.'
            );
            nav('/sites');
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to create site.');
        } finally {
            setSaving(false);
        }
    };
    return <div className="page"><div className="page-heading"><div><h1>New site</h1></div></div><form className="panel form-grid" onSubmit={submit}><FormField label="Site code"><input value={f.code} onChange={e => setF({
            ...f,
            code: e.target.value
        })} required /></FormField><FormField label="Site name"><input value={f.name} onChange={e => setF({
            ...f,
            name: e.target.value
        })} required /></FormField><FormField label="Address"><input value={f.address} onChange={e => setF({
            ...f,
            address: e.target.value
        })} required /></FormField><FormField label="Status"><select value={f.status} onChange={e => setF({
            ...f,
            status: e.target.value
        })}><option>ACTIVE</option><option>INACTIVE</option></select></FormField>{error && <div className="alert error full">{error}</div>}<div className="form-actions full"><button type="button" className="button ghost" onClick={() => nav('/sites')}>Cancel</button><button className="button primary" disabled={saving}>{saving ? 'Saving...' : 'Save site'}</button></div></form></div>;
}
