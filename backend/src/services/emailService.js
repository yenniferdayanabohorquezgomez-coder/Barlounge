const RESEND_API_URL = 'https://api.resend.com/emails';

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => {
        const entities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };

        return entities[character];
    });
}

async function sendRecoveryCode(
    email,
    name,
    recoveryCode,
    expirationMinutes
) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        throw new Error(
            'RESEND_API_KEY no está configurada en las variables del backend.'
        );
    }

    const recipient = String(email ?? '').trim();

    if (!recipient) {
        throw new Error(
            'No se puede enviar el código de recuperación: el usuario no tiene correo registrado.'
        );
    }

    // Para pruebas iniciales puede utilizarse onboarding@resend.dev.
    // Para enviar a los usuarios reales, configura EMAIL_FROM con un
    // remitente perteneciente a un dominio verificado en Resend.
    const sender =
        process.env.EMAIL_FROM || 'BARLOUNGE <onboarding@resend.dev>';

    const displayName = name || 'usuario';
    const safeName = escapeHtml(displayName);
    const safeCode = escapeHtml(recoveryCode);
    const minutes = Number(expirationMinutes);

    const text = `
Hola ${displayName},

Recibimos una solicitud para recuperar tu contraseña de BARLOUNGE.

Tu código de verificación es:

${recoveryCode}

Este código vence en ${expirationMinutes} minutos.

Si no solicitaste este cambio, puedes ignorar este mensaje.

BARLOUNGE
    `.trim();

    const html = `
        <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
            <h2>BARLOUNGE</h2>
            <p>Hola <strong>${safeName}</strong>,</p>
            <p>Recibimos una solicitud para recuperar tu contraseña.</p>
            <p>Tu código de verificación es:</p>
            <h1 style="letter-spacing: 6px;">${safeCode}</h1>
            <p>Este código vence en <strong>${minutes} minutos</strong>.</p>
            <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
            <p>BARLOUNGE</p>
        </div>
    `;

    const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: sender,
            to: [recipient],
            subject: 'BARLOUNGE - Código de recuperación',
            text,
            html
        })
    });

    const responseText = await response.text();
    let result = {};

    try {
        result = responseText ? JSON.parse(responseText) : {};
    } catch {
        result = { message: responseText };
    }

    if (!response.ok) {
        const reason =
            result.message || result.name || responseText || 'Error desconocido';

        throw new Error(
            `Resend rechazó el envío (HTTP ${response.status}): ${reason}`
        );
    }

    return result;
}

module.exports = {
    sendRecoveryCode
};