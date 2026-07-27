'use strict';

/**
 * Catálogo de canales de métricas para Agente Performance / Reporting.
 * Keys estables usadas en API, UI, seeds y analysis JSON.
 */

const CHANNELS = {
  meta_ads: {
    id: 'meta_ads',
    label: 'Meta Ads',
    kind: 'paid',
    envVars: ['META_ADS_ACCESS_TOKEN', 'META_ADS_ACCOUNT_ID'],
    blurb: 'Campañas Facebook / Instagram Ads (Marketing API)',
  },
  google_ads: {
    id: 'google_ads',
    label: 'Google Ads',
    kind: 'paid',
    envVars: ['GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID'],
    blurb: 'Search, Demand Gen, UAC y Performance Max',
  },
  linkedin_ads: {
    id: 'linkedin_ads',
    label: 'LinkedIn Ads',
    kind: 'paid',
    envVars: ['LINKEDIN_ADS_ACCESS_TOKEN', 'LINKEDIN_ADS_ACCOUNT_ID'],
    blurb: 'Campaign Manager B2B (stub — conectar token)',
  },
  tiktok_ads: {
    id: 'tiktok_ads',
    label: 'TikTok Ads',
    kind: 'paid',
    envVars: ['TIKTOK_ADS_ACCESS_TOKEN', 'TIKTOK_ADS_ADVERTISER_ID'],
    blurb: 'TikTok Marketing API (stub — conectar token)',
  },
  ga4: {
    id: 'ga4',
    label: 'Google Analytics (orgánico)',
    kind: 'organic',
    envVars: ['GA4_PROPERTY_ID', 'GA4_SERVICE_ACCOUNT_JSON'],
    blurb: 'Tráfico orgánico / web GA4 (stub)',
  },
  instagram_organic: {
    id: 'instagram_organic',
    label: 'Instagram orgánico',
    kind: 'organic',
    envVars: ['INSTAGRAM_GRAPH_TOKEN', 'INSTAGRAM_BUSINESS_ACCOUNT_ID'],
    blurb: 'Reach y engagement orgánico (Graph API stub)',
  },
  whatsapp: {
    id: 'whatsapp',
    label: 'WhatsApp',
    kind: 'messaging',
    envVars: ['WHATSAPP_METRICS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'],
    blurb: 'Conversaciones y tasa de respuesta (stub; Whapi/ManyChat aparte)',
  },
};

const ALL_CHANNEL_IDS = Object.keys(CHANNELS);

function channelLabel(id) {
  return CHANNELS[id]?.label || id;
}

function envReady(channelId) {
  const ch = CHANNELS[channelId];
  if (!ch) return false;
  if (channelId === 'ga4') {
    return Boolean(process.env.GA4_PROPERTY_ID) &&
      Boolean(process.env.GA4_SERVICE_ACCOUNT_JSON || process.env.GA4_ACCESS_TOKEN);
  }
  if (channelId === 'whatsapp') {
    return Boolean(
      process.env.WHATSAPP_METRICS_TOKEN ||
        process.env.WHAPI_TOKEN ||
        process.env.MANYCHAT_API_KEY
    );
  }
  return ch.envVars.every((name) => Boolean(process.env[name]));
}

/**
 * Normaliza lista de canales desde body/query.
 * Vacío / "all" → todos. Filtra ids desconocidos.
 */
function resolveChannels(input) {
  if (input == null || input === '' || input === 'all') return [...ALL_CHANNEL_IDS];
  const raw = Array.isArray(input)
    ? input
    : String(input)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  if (!raw.length || raw.includes('all')) return [...ALL_CHANNEL_IDS];
  const filtered = raw.filter((id) => CHANNELS[id]);
  return filtered.length ? filtered : [...ALL_CHANNEL_IDS];
}

function publicChannelStatus(channelId) {
  const ch = CHANNELS[channelId];
  if (!ch) return null;
  const ready = envReady(channelId);
  return {
    id: ch.id,
    label: ch.label,
    kind: ch.kind,
    blurb: ch.blurb,
    env_vars: ch.envVars,
    env_ready: ready,
    status: ready ? 'connected' : 'pending_config',
    setup: {
      title: ch.label,
      steps: [
        `Agregá en Vercel las variables: ${ch.envVars.join(', ')}`,
        'Sin keys, el Agente Performance usa métricas DEMO para este canal',
        'La lectura live se habilita cuando las credenciales estén presentes',
      ],
    },
  };
}

module.exports = {
  CHANNELS,
  ALL_CHANNEL_IDS,
  channelLabel,
  envReady,
  resolveChannels,
  publicChannelStatus,
};
