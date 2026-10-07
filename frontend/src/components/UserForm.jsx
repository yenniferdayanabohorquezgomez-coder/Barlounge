import FormField from './FormField';

export default function UserForm({
  form,
  setForm,
  roles,
  sites,
  includeCode = true
}) {
  return <>
    <FormField label="User code"><input value={form.code} onChange={e => setForm({
        ...form,
        code: e.target.value
      })} disabled={!includeCode} required /></FormField>
    <FormField label="Name"><input value={form.name} onChange={e => setForm({
        ...form,
        name: e.target.value
      })} required /></FormField>
    <FormField label="Password" required={!includeCode}><input type="password" minLength="8" value={form.password || ''} onChange={e => setForm({
        ...form,
        password: e.target.value
      })} placeholder={includeCode ? '' : 'Leave empty to keep current'} required={includeCode} /></FormField>
    <FormField label="Role"><select value={form.roleId} onChange={e => setForm({
        ...form,
        roleId: e.target.value
      })} required>{!form.roleId && <option value="">Select role</option>}{roles.map(r => <option key={r.role_id} value={r.role_id}>{r.name}</option>)}</select></FormField>
    <FormField label="Site"><select value={form.siteId} onChange={e => setForm({
        ...form,
        siteId: e.target.value
      })} required>{!form.siteId && <option value="">Select site</option>}{sites.map(s => <option key={s.site_id} value={s.site_id}>{s.code} · {s.name}</option>)}</select></FormField>
    <FormField label="Status"><select value={form.status} onChange={e => setForm({
        ...form,
        status: e.target.value
      })}><option>ACTIVE</option><option>INACTIVE</option></select></FormField>
  </>;
}