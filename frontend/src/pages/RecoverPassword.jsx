import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    recoverPassword,
    resetPassword,
    verifyRecoveryCode
} from '../services/authService';
import { showFlash } from '../utils/flashMessage';

export default function RecoverPassword() {

    // ========================================================
    // DATOS DEL FORMULARIO
    // ========================================================
    const [email, setEmail] = useState('');

    const [recoveryCode, setRecoveryCode] =
        useState('');

    const [resetToken, setResetToken] =
        useState('');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // ========================================================
    // CONTROL DE PASOS
    // ========================================================
    const [step, setStep] = useState(1);

    // ========================================================
    // MENSAJES
    // ========================================================
    const [message, setMessage] =
        useState('');

    const [error, setError] =
        useState('');

    const [saving, setSaving] =
        useState(false);

    // ========================================================
    // PASO 1
    // ENVIAR CÓDIGO
    // ========================================================
    const handleSendCode =
        async e => {

            e.preventDefault();

            setError('');
            setMessage('');
            setSaving(true);

            try {

                const response =
                    await recoverPassword(
                        email
                    );

                setMessage(
                    response.message
                );

                showFlash(
                    'success',
                    'A verification code has been sent to your email.'
                );

                setStep(2);

            } catch (err) {

                setError(
                    err.response?.data?.message ||
                    'Unable to send verification code.'
                );

            } finally {

                setSaving(false);
            }
        };

    // ========================================================
    // PASO 2
    // VERIFICAR CÓDIGO
    // ========================================================
    const handleVerifyCode =
        async e => {

            e.preventDefault();

            setError('');
            setMessage('');
            setSaving(true);

            try {

                const response =
                    await verifyRecoveryCode(
                        email,
                        recoveryCode
                    );

                setResetToken(
                    response.resetToken
                );

                showFlash(
                    'success',
                    'Verification code accepted.'
                );

                setMessage(
                    'Verification code accepted.'
                );

                showFlash(
                    'success',
                    'Password updated successfully.'
                );

                setStep(3);

            } catch (err) {

                setError(
                    err.response?.data?.message ||
                    'Invalid or expired verification code.'
                );

            } finally {

                setSaving(false);
            }
        };

    // ========================================================
    // PASO 3
    // ACTUALIZAR CONTRASEÑA
    // ========================================================
    const handleResetPassword =
        async e => {

            e.preventDefault();

            setError('');
            setMessage('');

            // ------------------------------------------------
            // Validar coincidencia.
            // ------------------------------------------------
            if (
                newPassword !==
                confirmPassword
            ) {

                setError(
                    'Passwords do not match.'
                );

                return;
            }

            // ------------------------------------------------
            // Validar longitud.
            // ------------------------------------------------
            if (
                newPassword.length < 8
            ) {

                setError(
                    'The password must contain at least 8 characters.'
                );

                return;
            }

            setSaving(true);

            try {

                const response =
                    await resetPassword(
                        resetToken,
                        newPassword
                    );

                setMessage(
                    response.message
                );

                setNewPassword('');
                setConfirmPassword('');

                setStep(4);

            } catch (err) {

                setError(
                    err.response?.data?.message ||
                    'Unable to update password.'
                );

            } finally {

                setSaving(false);
            }
        };

    // ========================================================
    // RENDER
    // ========================================================
    return (
        <main className="auth-page">

            <section className="auth-card">

                <h1>
                    Password recovery
                </h1>

                <p className="muted">
                    Recover your account using
                    your registered email.
                </p>

                {/* ==================================================
                    PASO 1 - EMAIL
                ================================================== */}
                {step === 1 && (

                    <form
                        onSubmit={handleSendCode}
                        className="stack"
                    >

                        <label className="field">

                            <span>
                                Email
                                <b>*</b>
                            </span>

                            <input
                                type="email"
                                value={email}
                                onChange={e =>
                                    setEmail(
                                        e.target.value
                                    )
                                }
                                placeholder="usuario@correo.com"
                                required
                            />

                        </label>

                        <button
                            className="button primary"
                            disabled={saving}
                        >
                            {saving
                                ? 'Sending...'
                                : 'Send verification code'}
                        </button>

                    </form>
                )}

                {/* ==================================================
                    PASO 2 - CÓDIGO
                ================================================== */}
                {step === 2 && (

                    <form
                        onSubmit={handleVerifyCode}
                        className="stack"
                    >

                        <label className="field">

                            <span>
                                Verification code
                                <b>*</b>
                            </span>

                            <input
                                inputMode="numeric"
                                maxLength="6"
                                value={recoveryCode}
                                onChange={e =>
                                    setRecoveryCode(
                                        e.target.value.replace(
                                            /\D/g,
                                            ''
                                        )
                                    )
                                }
                                placeholder="123456"
                                required
                            />

                        </label>

                        <button
                            className="button primary"
                            disabled={saving}
                        >
                            {saving
                                ? 'Verifying...'
                                : 'Verify code'}
                        </button>

                    </form>
                )}

                {/* ==================================================
                    PASO 3 - NUEVA CONTRASEÑA
                ================================================== */}
                {step === 3 && (

                    <form
                        onSubmit={handleResetPassword}
                        className="stack"
                    >

                        <label className="field">
                            <span>
                                New password<b>*</b>
                            </span>
                            <div className="password-field">
                                <input
                                    type={
                                        showNewPassword
                                            ? 'text'
                                            : 'password'
                                    }
                                    minLength="8"
                                    value={newPassword}
                                    onChange={e =>
                                        setNewPassword(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Enter your new password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-eye"
                                    onClick={() =>
                                        setShowNewPassword(
                                            !showNewPassword
                                        )
                                    }
                                    aria-label={
                                        showNewPassword
                                            ? 'Hide new password'
                                            : 'Show new password'
                                    }
                                >
                                    {showNewPassword ? (
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
                        <label className="field">
                            <span>
                                Confirm password<b>*</b>
                            </span>
                            <div className="password-field">
                                <input
                                    type={
                                        showConfirmPassword
                                            ? 'text'
                                            : 'password'
                                    }
                                    minLength="8"
                                    value={confirmPassword}
                                    onChange={e =>
                                        setConfirmPassword(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Confirm your new password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-eye"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            !showConfirmPassword
                                        )
                                    }
                                    aria-label={
                                        showConfirmPassword
                                            ? 'Hide confirmed password'
                                            : 'Show confirmed password'
                                    }
                                >
                                    {showConfirmPassword ? (
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
                        <button
                            className="button primary"
                            disabled={saving}
                        >
                            {saving
                                ? 'Updating...'
                                : 'Update password'}
                        </button>

                    </form>
                )}

                {/* ==================================================
                    PASO 4 - FINALIZADO
                ================================================== */}
                {step === 4 && (

                    <div className="stack">

                        <div className="alert success">
                            Password updated successfully.
                        </div>

                        <Link
                            to="/login"
                            className="button primary"
                        >
                            Back to sign in
                        </Link>

                    </div>
                )}

                {/* ==================================================
                    MENSAJE
                ================================================== */}
                {message && step !== 4 && (

                    <div className="alert success">
                        {message}
                    </div>
                )}

                {/* ==================================================
                    ERROR
                ================================================== */}
                {error && (

                    <div className="alert error">
                        {error}
                    </div>
                )}

                {/* ==================================================
                    VOLVER AL LOGIN
                ================================================== */}
                {step !== 4 && (

                    <Link
                        to="/login"
                        className="link"
                    >
                        Back to sign in
                    </Link>
                )}

            </section>

        </main>
    );
}