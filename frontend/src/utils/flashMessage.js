const FLASH_KEY = 'barlounge_flash_message';

export function showFlash(
    type,
    message
) {
    try {

        sessionStorage.setItem(
            FLASH_KEY,
            JSON.stringify({
                type,
                message
            })
        );

        // Notificar inmediatamente a los componentes
        // que estén escuchando.
        window.dispatchEvent(
            new CustomEvent(
                'barlounge:flash'
            )
        );

    } catch {
        // Si sessionStorage no está disponible,
        // simplemente no se muestra el mensaje.
    }
}


export function getFlash() {

    try {

        const raw =
            sessionStorage.getItem(
                FLASH_KEY
            );

        if (!raw) {
            return null;
        }

        sessionStorage.removeItem(
            FLASH_KEY
        );

        return JSON.parse(raw);

    } catch {

        return null;
    }
}