
const { google } = require('googleapis');

// ============================================================
// CONFIGURACIÓN DE GMAIL API
// ============================================================

function createGmailClient() {
    const {
        GMAIL_CLIENT_ID,
        GMAIL_CLIENT_SECRET,
        GMAIL_REFRESH_TOKEN,
        GMAIL_USER
    } = process.env;

    if (
        !GMAIL_CLIENT_ID ||
        !GMAIL_CLIENT_SECRET ||
        !GMAIL_REFRESH_TOKEN ||
        !GMAIL_USER
    ) {
        throw new Error(
            'Faltan variables de configuración de Gmail API en Railway.'
        );
    }

    const auth = new google.auth.OAuth2(
        GMAIL_CLIENT_ID,
        GMAIL_CLIENT_SECRET
    );

    auth.setCredentials({
        refresh_token: GMAIL_REFRESH_TOKEN
    });

    return google.gmail({
        version: 'v1',
        auth
    });
}

// ============================================================
// PROTEGER CONTENIDO HTML
// ============================================================

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

// ============================================================
// CONSTRUIR CORREO
// ============================================================

function createEmailMessage(
    email,
    name,
    recoveryCode,
    expirationMinutes
) {
    const sender = process.env.GMAIL_USER;

    const safeName = escapeHtml(name || 'usuario');
    const safeCode = escapeHtml(recoveryCode);

    const text = `
Hola ${name || 'usuario'},

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

            <p>
                Recibimos una solicitud para recuperar
                tu contraseña.
            </p>

            <p>Tu código de verificación es:</p>

            <h1 style="letter-spacing: 6px;">
                ${safeCode}
            </h1>

            <p>
                Este código vence en
                <strong>${Number(expirationMinutes)} minutos</strong>.
            </p>

            <p>
                Si no solicitaste este cambio,
                puedes ignorar este mensaje.
            </p>

            <p>BARLOUNGE</p>
        </div>
    `;

    const boundary = `barlounge_${Date.now()}`;

    const mimeMessage = [
        `From: BARLOUNGE <${sender}>`,
        `To: ${email}`,
        'Subject: BARLOUNGE - Código de recuperación',
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(text, 'utf8').toString('base64'),
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(html, 'utf8').toString('base64'),
        '',
        `--${boundary}--`
    ].join('\r\n');

    return Buffer.from(mimeMessage, 'utf8')
        .toString('base64url');
}

// ============================================================
// ENVIAR CÓDIGO DE RECUPERACIÓN
// ============================================================

async function sendRecoveryCode(
    email,
    name,
    recoveryCode,
    expirationMinutes
) {
    const recipient = String(email || '').trim();

    if (
        !recipient ||
        /[\r\n]/.test(recipient) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)
    ) {
        throw new Error(
            'La dirección de correo del destinatario no es válida.'
        );
    }

    const gmail = createGmailClient();

    const rawMessage = createEmailMessage(
        recipient,
        name,
        recoveryCode,
        expirationMinutes
    );

    try {
        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: rawMessage
            }
        });

        console.log(
            '[BARLOUNGE] Correo de recuperación enviado correctamente.'
        );

        return response.data;

    } catch (error) {
        const message =
            error.response?.data?.error?.message ||
            error.message ||
            'Error desconocido';

        console.error(
            '[BARLOUNGE] Error enviando correo mediante Gmail API:',
            message
        );

        throw new Error(
            `No fue posible enviar el correo de recuperación: ${message}`
        );
    }
}

module.exports = {
    sendRecoveryCode
};
