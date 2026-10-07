import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormField from '../components/FormField';
import { getRoles } from '../services/roleService';
import { getSites } from '../services/siteService';
import { createUser } from '../services/userService';
import { showFlash } from '../utils/flashMessage';

const initial = {
    code: '',
    name: '',
    email: '',
    password: '',
    roleId: '',
    siteId: '',
    status: 'ACTIVE'
};

export default function NewUser() {
    const nav = useNavigate();
    const [f, setF] = useState(initial);
    const [roles, setRoles] = useState([]);
    const [sites, setSites] = useState([]);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        Promise.all([getRoles(), getSites()]).then(([r, s]) => {
            setRoles(r);
            setSites(s);
        }).catch(e => setError(e.response?.data?.message || 'Unable to load form data.'));
    }, []);
    const submit = async e => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await createUser({
                ...f,
                roleId: Number(f.roleId),
                siteId: Number(f.siteId)
            });
            showFlash(
                'success',
                'User created successfully.'
            );
            nav('/users');
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to create user.');
        } finally {
            setSaving(false);
        }
    };
    return (
    <div className="page">

        <div className="page-heading">
            <div>
                <h1>New user</h1>
            </div>
        </div>

        <form
            className="panel form-grid"
            onSubmit={submit}
        >

            {/* Código del usuario */}
            <FormField label="User code">
                <input
                    value={f.code}
                    onChange={e =>
                        setF({
                            ...f,
                            code: e.target.value
                        })
                    }
                    required
                />
            </FormField>

            {/* Nombre */}
            <FormField label="Name">
                <input
                    value={f.name}
                    onChange={e =>
                        setF({
                            ...f,
                            name: e.target.value
                        })
                    }
                    required
                />
            </FormField>

            {/* ==================================================
                CORREO ELECTRÓNICO
                Este es el correo al que posteriormente
                se enviará el código de recuperación.
            ================================================== */}
            <FormField label="Email">
                <input
                    type="email"
                    value={f.email}
                    onChange={e =>
                        setF({
                            ...f,
                            email: e.target.value
                        })
                    }
                    placeholder="usuario@correo.com"
                    required
                />
            </FormField>

            {/* Contraseña */}
            <FormField label="Password">
                <input
                    type="password"
                    minLength="8"
                    value={f.password}
                    onChange={e =>
                        setF({
                            ...f,
                            password: e.target.value
                        })
                    }
                    required
                />
            </FormField>

            {/* Rol */}
            <FormField label="Role">
                <select
                    value={f.roleId}
                    onChange={e =>
                        setF({
                            ...f,
                            roleId: e.target.value
                        })
                    }
                    required
                >
                    <option value="">
                        Select role
                    </option>

                    {roles.map(r => (
                        <option
                            key={r.role_id}
                            value={r.role_id}
                        >
                            {r.name}
                        </option>
                    ))}
                </select>
            </FormField>

            {/* Sede */}
            <FormField label="Site">
                <select
                    value={f.siteId}
                    onChange={e =>
                        setF({
                            ...f,
                            siteId: e.target.value
                        })
                    }
                    required
                >
                    <option value="">
                        Select site
                    </option>

                    {sites.map(s => (
                        <option
                            key={s.site_id}
                            value={s.site_id}
                        >
                            {s.code} · {s.name}
                        </option>
                    ))}
                </select>
            </FormField>

            {/* Estado */}
            <FormField label="Status">
                <select
                    value={f.status}
                    onChange={e =>
                        setF({
                            ...f,
                            status: e.target.value
                        })
                    }
                >
                    <option value="ACTIVE">
                        ACTIVE
                    </option>

                    <option value="INACTIVE">
                        INACTIVE
                    </option>
                </select>
            </FormField>

            {/* Error */}
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
                    onClick={() => nav('/users')}
                >
                    Cancel
                </button>

                <button
                    className="button primary"
                    disabled={saving}
                >
                    {saving
                        ? 'Saving...'
                        : 'Save user'}
                </button>

            </div>

        </form>
    </div>
);
}