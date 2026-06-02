const config = require('../config');
const logger = require('./logger');
const { withRetry } = require('./retry');

/**
 * Refresca el long-lived token de Meta.
 * Se debe llamar periódicamente (sugerido: cada 50 días, expiran a los 60).
 */
async function refreshMetaToken() {
  const { appId, appSecret, accessToken } = config.meta;

  if (!appId || !appSecret || !accessToken) {
    logger.warn('Meta token refresh: credenciales no configuradas, salteando.');
    return null;
  }

  return withRetry(
    async () => {
      const url =
        `https://graph.facebook.com/v19.0/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&fb_exchange_token=${accessToken}`;

      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Meta token refresh falló: ${res.status} ${body}`);
      }

      const data = await res.json();
      logger.info({ msg: 'Meta token refrescado exitosamente', expiresIn: data.expires_in });
      return data.access_token;
    },
    { retries: 3, context: 'metaToken.refresh' }
  );
}

module.exports = { refreshMetaToken };
