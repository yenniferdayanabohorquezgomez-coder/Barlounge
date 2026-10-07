import { useEffect, useState } from 'react';
import { getFlash } from '../utils/flashMessage';

export default function FlashMessage() {

    const [flash, setFlash] =
        useState(null);

    // =========================================================
    // MOSTRAR MENSAJE
    // =========================================================
    const loadFlash = () => {

        const message =
            getFlash();

        if (!message) {
            return;
        }

        setFlash(message);

        // Ocultar automáticamente
        // después de 4 segundos.
        setTimeout(() => {
            setFlash(null);
        }, 4000);
    };

    // =========================================================
    // AL CARGAR
    // =========================================================
    useEffect(() => {

        loadFlash();

        const handleFlash = () => {
            loadFlash();
        };

        window.addEventListener(
            'barlounge:flash',
            handleFlash
        );

        return () => {

            window.removeEventListener(
                'barlounge:flash',
                handleFlash
            );

        };

    }, []);

    // =========================================================
    // NO MOSTRAR NADA
    // =========================================================
    if (!flash) {
        return null;
    }

    // =========================================================
    // ICONO
    // =========================================================
    const icon =
        flash.type === 'success'
            ? '✓'
            : '✕';

    // =========================================================
    // RENDER
    // =========================================================
    return (
        <div
            className={
                `flash-message ${flash.type}`
            }
        >

            <span className="flash-icon">
                {icon}
            </span>

            <span className="flash-text">
                {flash.message}
            </span>

            <button
                type="button"
                className="flash-close"
                onClick={() =>
                    setFlash(null)
                }
                aria-label="Close notification"
            >
                ×
            </button>

        </div>
    );
}