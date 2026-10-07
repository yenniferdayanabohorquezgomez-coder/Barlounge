import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FormField from '../components/FormField';
import { getRoles } from '../services/roleService';
import { getSites } from '../services/siteService';
import { getUser, updateUser } from '../services/userService';
import { showFlash } from '../utils/flashMessage';

export default function EditUser() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState(null);
    const [roles, setRoles] = useState([]);
    const [sites, setSites] = useState([]);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    // Cargar usuario, roles y sitios
    useEffect(() => {
        Promise.all([
            getUser(id),
            getRoles(),
            getSites()
        ])
            .then(([user, rolesData, sitesData]) => {
                setForm({
                    ...user,
                    roleId: user.role_id,
                    siteId: user.site_id,
                    password: ''
                });

                setRoles(rolesData);
                setSites(sitesData);
            })
            .catch(err => {
                setError(
                    err.response?.data?.message ||
                    'Unable to load user.'
                );
            });
    }, [id]);

    // Mostrar carga mientras llega la información
    if (!form) {
        return (
            <div className="panel">
                {error || 'Loading...'}
            </div>
        );
    }

    // Actualizar un campo del formulario
    const handleChange = (field, value) => {
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Enviar formulario
    const handleSubmit = async event => {
        event.preventDefault();

        setSaving(true);
        setError('');

        const data = {
            code: form.code,
            name: form.name,
            email: form.email,
            roleId: Number(form.roleId),
            siteId: Number(form.siteId),
            status: form.status
        };

        // Solo enviar contraseña si el usuario escribió una nueva
        if (form.password) {
            data.password = form.password;
        }

        try {
            await updateUser(id, data);
            showFlash(
                'success',
                'User updated successfully.'
            );
            navigate('/users');
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to update user.'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="page">
            <div className="page-heading">
                <div>
                    <h1>Edit user</h1>
                </div>
            </div>

            <form
                className="panel form-grid"
                onSubmit={handleSubmit}
            >
                {/* Código de usuario */}
                <FormField label="User code">
                    <input
                        value={form.code}
                        onChange={e =>
                            handleChange('code', e.target.value)
                        }
                        required
                    />
                </FormField>

                {/* Nombre */}
                <FormField label="Name">
                    <input
                        value={form.name}
                        onChange={e =>
                            handleChange('name', e.target.value)
                        }
                        required
                    />
                </FormField>

                {/* Correo electrónico */}
                <FormField label="Email">
                    <input
                        type="email"
                        value={form.email || ''}
                        onChange={e =>
                            handleChange('email', e.target.value)
                        }
                        placeholder="usuario@correo.com"
                        required
                    />
                </FormField>

                {/* Nueva contraseña */}
                <FormField
                    label="New password"
                    required={false}
                >
                    <input
                        type="password"
                        minLength="8"
                        value={form.password}
                        onChange={e =>
                            handleChange('password', e.target.value)
                        }
                        placeholder="Leave empty to keep current"
                    />
                </FormField>

                {/* Rol */}
                <FormField label="Role">
                    <select
                        value={form.roleId}
                        onChange={e =>
                            handleChange('roleId', e.target.value)
                        }
                        required
                    >
                        {roles.map(role => (
                            <option
                                key={role.role_id}
                                value={role.role_id}
                            >
                                {role.name}
                            </option>
                        ))}
                    </select>
                </FormField>

                {/* Sede */}
                <FormField label="Site">
                    <select
                        value={form.siteId}
                        onChange={e =>
                            handleChange('siteId', e.target.value)
                        }
                        required
                    >
                        {sites.map(site => (
                            <option
                                key={site.site_id}
                                value={site.site_id}
                            >
                                {site.code} · {site.name}
                            </option>
                        ))}
                    </select>
                </FormField>

                {/* Estado */}
                <FormField label="Status">
                    <select
                        value={form.status}
                        onChange={e =>
                            handleChange('status', e.target.value)
                        }
                    >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                    </select>
                </FormField>

                {/* Mensaje de error */}
                {error && (
                    <div className="alert error full">
                        {error}
                    </div>
                )}

                {/* Botones */}
                <div className="form-actions full">
                    <button
                        type="button"
                        className="button ghost"
                        onClick={() => navigate('/users')}
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        className="button primary"
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}