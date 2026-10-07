import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showFlash } from '../utils/flashMessage';

export default function Login() {
    const {
        login
    } = useAuth();
    const nav = useNavigate();
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const submit = async e => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            await login(code, password);
            showFlash(
                'success',
                'Welcome back.'
            );
            nav('/dashboard', {
                replace: true
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to sign in.');
        } finally {
            setSaving(false);
        }
    };
    return <main className="auth-page">
                <section className="auth-card">
                    <div className="brand auth-brand">
                        <img
                            src="/barlounge-logo.png"
                            alt="BARLOUNGE"
                        />
                    </div>
                <h1>Sign in</h1>
                <form onSubmit={submit} className="stack">
                    <label className="field">
                        <span>
                            User code<b>*</b>
                        </span>

                        <input
                            type="text"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            placeholder="Enter your user code"
                            autoComplete="username"
                            required
                        />
                    </label>

                    <label className="field">
                        <span>
                            Password<b>*</b>
                        </span>
                        <div className="password-field">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e =>
                                    setPassword(e.target.value)
                                }
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                required
                            />

                            <button
                                type="button"
                                className="password-eye"
                                onClick={() =>
                                    setShowPassword(
                                        !showPassword
                                    )
                                }
                                aria-label={
                                    showPassword
                                    ? 'Hide password'
                                    : 'Show password'
                                }
                            >
                                {showPassword ? (

                                    /* Ojo cerrado */
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M3 3l18 18" />

                                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />

                                        <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9.5 8 9.5 8a16.2 16.2 0 0 1-3.1 3.8" />

                                        <path d="M6.2 6.2C3.7 7.8 2.5 12 2.5 12s3.5 8 9.5 8a10.5 10.5 0 0 0 3.4-.5" />
                                    </svg>
                                ) : (

                                    /* Ojo abierto */
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />

                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="2.5"
                                        />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </label>
                    {error && (
                        <div className="alert error">{error}</div>
                    )}
                    <button className="button primary" disabled={saving}>
                        {saving ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>
                <Link to="/recover-password" className="link">
                    Forgot password?
                </Link>
            </section>
        </main>;
}