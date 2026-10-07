const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,

    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },

    requireTLS: true,

    tls: {
        rejectUnauthorized: false
    }
});

async function sendRecoveryCode(
    email,
    name,
    recoveryCode,
    expirationMinutes
) {
    await transporter.sendMail({
        from:
            process.env.SMTP_FROM ||
            process.env.SMTP_USER,

        to: email,

        subject:
            'BARLOUNGE - Código de recuperación',

        text: `
Hola ${name},

Recibimos una solicitud para recuperar tu contraseña de BARLOUNGE.

Tu código de verificación es:

${recoveryCode}

Este código vence en ${expirationMinutes} minutos.

Si no solicitaste este cambio, puedes ignorar este mensaje.

BARLOUNGE
        `,

        html: `
            <div style="font-family: Arial, sans-serif;">
                <h2>BARLOUNGE</h2>

                <p>
                    Hola <strong>${name}</strong>,
                </p>

                <p>
                    Recibimos una solicitud para recuperar
                    tu contraseña.
                </p>

                <p>
                    Tu código de verificación es:
                </p>

                <h1 style="letter-spacing: 6px;">
                    ${recoveryCode}
                </h1>

                <p>
                    Este código vence en
                    <strong>${expirationMinutes} minutos</strong>.
                </p>

                <p>
                    Si no solicitaste este cambio,
                    puedes ignorar este mensaje.
                </p>

                <p>BARLOUNGE</p>
            </div>
        `
    });
}

module.exports = {
    sendRecoveryCode
};