'use strict';

/**
 * Integración Google Ads — lectura de métricas para el Agente 04 (Performance).
 * Usa la API de Google Ads vía REST (no la librería oficial de Node que requiere gRPC).
 *
 * Referencia: https://developers.google.com/google-ads/api/rest/overview
 */

const config = require('../config');
const logger = require('../lib/logger');
const { withRetry } = require('../lib/retry');

let _accessToken = null;
let _tokenExpiry = 0;

async function getAccessToken() {
  if (_accessToken && Date.now() < _tokenExpiry - 60_000) return _accessToken;

  const { clientId, clientSecret, refreshToken } = config.googleAds;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Credenciales de Google Ads no configuradas (GOOGLE_ADS_CLIENT_ID/SECRET/REFRESH_TOKEN)');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) throw new Error(`Google OAuth error: ${res.status}`);
  const data = await res.json();

  _accessToken = data.access_token;
  _tokenExpiry = Date.now() + data.expires_in * 1000;
  return _accessToken;
}

/**
 * Ejecuta una query GAQL sobre la cuenta de Google Ads.
 * @param {string} gaqlQuery - Query en Google Ads Query Language
 */
async function query(gaqlQuery) {
  const customerId = config.googleAds.customerId;
  if (!customerId) throw new Error('GOOGLE_ADS_CUSTOMER_ID no configurado');

  return withRetry(
    async () => {
      const token = await getAccessToken();

      const res = await fetch(
        `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: gaqlQuery }),
        }
      );

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Google Ads API error: ${res.status} ${body}`);
      }

      const data = await res.json();
      logger.info({ msg: 'Google Ads query ejecutada', rows: data.results?.length });
      return data.results || [];
    },
    { retries: 3, context: 'googleAds.query' }
  );
}

/**
 * Obtiene resumen de rendimiento de campañas en un rango de fechas.
 */
async function getCampaignPerformance(since, until) {
  const gaql = `
    SELECT
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE segments.date BETWEEN '${since}' AND '${until}'
      AND campaign.status = 'ENABLED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `;
  return query(gaql);
}

module.exports = { query, getCampaignPerformance };
