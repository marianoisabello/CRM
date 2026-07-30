'use strict';

/**
 * Integración Whapi.Cloud — bot de WhatsApp directo (sin Meta ni ManyChat).
 * Docs: https://whapi.readme.io/reference/sendmessagetext
 */

const config = require('../config');
const logger = require('../lib/logger');
const { withRetry } = require('../lib/retry');

function getToken() {
  if (!config.whapi.token) throw new Error('WHAPI_TOKEN no configurada');
  return config.whapi.token;
}

/** Whapi espera el número en formato internacional sin "+" (ej: 5491122334455) */
function normalizePhone(phone) {
  return String(phone).replace(/\D/g, '');
}

/**
 * Envía un mensaje de texto por WhatsApp.
 * @param {string} to - Número de teléfono (con o sin "+", código de país incluido)
 * @param {string} body - Texto del mensaje
 */
async function sendText(to, body) {
  const token = getToken();
  const url = `${config.whapi.baseUrl}/messages/text`;

  return withRetry(
    async () => {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: normalizePhone(to), body }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Whapi respondió ${res.status}: ${text}`);
      }

      return res.json();
    },
    { retries: 2, context: `whapi.sendText.${to}` }
  ).catch((err) => {
    logger.error({ msg: 'Error enviando mensaje por Whapi', to, error: err.message });
    throw err;
  });
}

module.exports = { sendText, normalizePhone };
