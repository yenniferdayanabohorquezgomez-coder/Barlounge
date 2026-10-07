import FormField from './FormField';
export default function SiteForm({
  form,
  setForm
}) {
  return <>
    <FormField label="Site code"><input value={form.code} onChange={e => setForm({
        ...form,
        code: e.target.value
      })} required /></FormField>
    <FormField label="Site name"><input value={form.name} onChange={e => setForm({
        ...form,
        name: e.target.value
      })} required /></FormField>
    <FormField label="Address"><input value={form.address} onChange={e => setForm({
        ...form,
        address: e.target.value
      })} required /></FormField>
    <FormField label="Status"><select value={form.status} onChange={e => setForm({
        ...form,
        status: e.target.value
      })}><option>ACTIVE</option><option>INACTIVE</option></select></FormField>
  </>;
}