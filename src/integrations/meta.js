'use strict';

/**
 * Integración Meta Ads — solo lectura de métricas de campañas.
 * NO incluye mensajería directa (WhatsApp/Instagram): eso va por ManyChat.
 *
 * Referencia: https://developers.facebook.com/docs/marketing-api/reference/ad-account/insights
 */

const config = require('../config');
const logger = require('../lib/logger');
const { withRetry } = require('../lib/retry');

const BASE_URL = 'https://graph.facebook.com/v19.0';

function getToken() {
  if (!config.metaAds.accessToken) throw new Error('META_ADS_ACCESS_TOKEN no configurada');
  return config.metaAds.accessToken;
}

/**
 * Obtiene métricas de campaña por rango de fechas.
 * @param {Object} params
 * @param {string} params.since  - YYYY-MM-DD
 * @param {string} params.until  - YYYY-MM-DD
 * @param {string[]} [params.fields] - campos de insights a solicitar
 */
async function getCampaignInsights({ since, until, fields }) {
  const adAccountId = config.metaAds.adAccountId;
  if (!adAccountId) throw new Error('META_ADS_ACCOUNT_ID no configurada');

  const defaultFields = [
    'campaign_name',
    'impressions',
    'clicks',
    'spend',
    'reach',
    'cpm',
    'cpc',
    'ctr',
    'actions',
    'cost_per_action_type',
  ];

  const resolvedFields = fields || defaultFields;

  return withRetry(
    async () => {
      const params = new URLSearchParams({
        access_token: getToken(),
        time_range: JSON.stringify({ since, until }),
        fields: resolvedFields.join(','),
        level: 'campaign',
        limit: '50',
      });

      const url = `${BASE_URL}/${adAccountId}/insights?${params}`;
      const res = await fetch(url);

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Meta Ads insights error: ${res.status} ${body}`);
      }

      const data = await res.json();
      logger.info({ msg: 'Meta Ads insights obtenidos', campaigns: data.data?.length });
      return data.data || [];
    },
    { retries: 3, context: 'meta.getCampaignInsights' }
  );
}

/**
 * Refresca el long-lived token de Meta Ads.
 * Llamar cada ~50 días (expiran a los 60).
 */
async function refreshToken() {
  const { appSecret } = config.metaAds;
  if (!appSecret) {
    logger.warn('META_APP_SECRET no configurado, no se puede refrescar token');
    return null;
  }

  return withRetry(
    async () => {
      const params = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: config.metaAds.adAccountId,
        client_secret: appSecret,
        fb_exchange_token: getToken(),
      });

      const res = await fetch(`${BASE_URL}/oauth/access_token?${params}`);
      if (!res.ok) throw new Error(`Token refresh error: ${res.status}`);

      const data = await res.json();
      logger.info({ msg: 'Meta Ads token refrescado', expiresIn: data.expires_in });
      return data.access_token;
    },
    { retries: 3, context: 'meta.refreshToken' }
  );
}

module.exports = { getCampaignInsights, refreshToken };
