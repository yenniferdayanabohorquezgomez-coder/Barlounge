const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const VERSION = 'v1';

// ============================================================
// OBTENER CLAVE DE 256 BITS
// ============================================================

function getEncryptionKey() {
    const encodedKey =
        process.env.INVOICE_DATA_ENCRYPTION_KEY;

    if (!encodedKey) {
        throw new Error(
            'Invoice encryption key is not configured.'
        );
    }

    const key = Buffer.from(
        encodedKey.trim(),
        'base64'
    );

    if (key.length !== 32) {
        throw new Error(
            'AES-256 requires a 32-byte encryption key.'
        );
    }

    return key;
}

// ============================================================
// CIFRAR INFORMACIÓN
// ============================================================

function encryptSensitiveText(value) {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return null;
    }

    if (typeof value !== 'string') {
        throw new TypeError(
            'The value to encrypt must be text.'
        );
    }

    const key = getEncryptionKey();

    // IV aleatorio para cada operación.
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(
        ALGORITHM,
        key,
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(value, 'utf8'),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Formato:
    // v1:IV:AUTH_TAG:DATA

    return [
        VERSION,
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted.toString('base64')
    ].join(':');
}

// ============================================================
// DESCIFRAR INFORMACIÓN
// ============================================================

function decryptSensitiveText(payload) {
    if (
        payload === null ||
        payload === undefined ||
        payload === ''
    ) {
        return null;
    }

    if (typeof payload !== 'string') {
        throw new TypeError(
            'The encrypted value must be text.'
        );
    }

    const parts = payload.split(':');

    if (
        parts.length !== 4 ||
        parts[0] !== VERSION
    ) {
        throw new Error(
            'Invalid encrypted data format.'
        );
    }

    const key = getEncryptionKey();

    const iv = Buffer.from(parts[1], 'base64');
    const authTag = Buffer.from(parts[2], 'base64');
    const encrypted = Buffer.from(parts[3], 'base64');

    if (
        iv.length !== IV_LENGTH ||
        authTag.length !== AUTH_TAG_LENGTH
    ) {
        throw new Error(
            'Invalid AES-GCM data.'
        );
    }

    try {
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            key,
            iv
        );

        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);

        return decrypted.toString('utf8');

    } catch {
        throw new Error(
            'Invoice data could not be decrypted or was modified.'
        );
    }
}

module.exports = {
    encryptSensitiveText,
    decryptSensitiveText
};