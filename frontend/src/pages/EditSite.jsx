import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FormField from '../components/FormField';
import { getSite, updateSite } from '../services/siteService';
import { showFlash } from '../utils/flashMessage';

export default function EditSite() {
    const {
        id
    } = useParams();
    const nav = useNavigate();
    const [f, setF] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        getSite(id).then(setF).catch(e => setError(e.response?.data?.message || 'Unable to load site.'));
    }, [id]);
    if (!f) return <div className="panel">{error || 'Loading...'}</div>;
    const submit = async e => {
        e.preventDefault();
        try {
            await updateSite(id, {
                name: f.name,
                address: f.address,
                status: f.status
            });
            showFlash(
                'success',
                'Site updated successfully.'
            );
            nav('/sites');
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to update site.');
        }
    };
    return <div className="page"><div className="page-heading"><div><h1>Edit site</h1></div></div><form className="panel form-grid" onSubmit={submit}><FormField label="Site code"><input value={f.code} disabled /></FormField><FormField label="Site name"><input value={f.name} onChange={e => setF({
            ...f,
            name: e.target.value
        })} required /></FormField><FormField label="Address"><input value={f.address} onChange={e => setF({
            ...f,
            address: e.target.value
        })} required /></FormField><FormField label="Status"><select value={f.status} onChange={e => setF({
            ...f,
            status: e.target.value
        })}><option>ACTIVE</option><option>INACTIVE</option></select></FormField>{error && <div className="alert error full">{error}</div>}<div className="form-actions full"><button type="button" className="button ghost" onClick={() => nav('/sites')}>Cancel</button><button className="button primary">Save changes</button></div></form></div>;
}