export default function FormField({
    label,
    children,
    required = true
}) {
    return <label className="field"><span>{label}{required && <b>*</b>}</span>{children}</label>;
}