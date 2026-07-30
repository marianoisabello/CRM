require('dotenv').config();

const required = (name) => {
  const val = process.env[name];
  if (!val) throw new Error(`Variable de entorno requerida: ${name}`);
  return val;
};

const optional = (name) => process.env[name] || null;

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: required('SUPABASE_URL'),
    serviceKey: required('SUPABASE_SERVICE_KEY'),
  },

  // API de IA — Anthropic (principal) u OpenAI (fallback)
  ai: {
    anthropicApiKey: optional('ANTHROPIC_API_KEY'),
    openaiApiKey: optional('OPENAI_API_KEY'),
    // Modelo por defecto para cada agente (se puede sobreescribir por agente)
    defaultModel: process.env.AI_DEFAULT_MODEL || 'claude-opus-4-6',
  },

  // ManyChat — canal de WhatsApp e Instagram hasta tener verificación Meta propia
  manychat: {
    apiKey: optional('MANYCHAT_API_KEY'),
    webhookSecret: optional('MANYCHAT_WEBHOOK_SECRET'),
  },

  // Whapi.Cloud — bot de WhatsApp directo (sin pasar por Meta ni ManyChat)
  whapi: {
    token: optional('WHAPI_TOKEN'),
    baseUrl: process.env.WHAPI_BASE_URL || 'https://gate.whapi.cloud',
    webhookSecret: optional('WHAPI_WEBHOOK_SECRET'),
  },

  // Bot de calificación por WhatsApp — keywords que activan el flujo de preguntas
  whatsappBot: {
    triggerKeywords: (process.env.WHATSAPP_BOT_TRIGGER_KEYWORDS ||
      'informacion,información,info,quiero saber,dana mkt,dana marketing')
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean),
  },

  // Meta Ads (solo para lectura de métricas de campañas, sin mensajería directa)
  metaAds: {
    accessToken: optional('META_ADS_ACCESS_TOKEN'),
    adAccountId: optional('META_ADS_ACCOUNT_ID'),
    appSecret: optional('META_APP_SECRET'),
  },

  // Google Ads
  googleAds: {
    clientId: optional('GOOGLE_ADS_CLIENT_ID'),
    clientSecret: optional('GOOGLE_ADS_CLIENT_SECRET'),
    refreshToken: optional('GOOGLE_ADS_REFRESH_TOKEN'),
    customerId: optional('GOOGLE_ADS_CUSTOMER_ID'),
  },

  // LinkedIn Ads (stub)
  linkedinAds: {
    accessToken: optional('LINKEDIN_ADS_ACCESS_TOKEN'),
    accountId: optional('LINKEDIN_ADS_ACCOUNT_ID'),
  },

  // TikTok Ads (stub)
  tiktokAds: {
    accessToken: optional('TIKTOK_ADS_ACCESS_TOKEN'),
    advertiserId: optional('TIKTOK_ADS_ADVERTISER_ID'),
  },

  // Google Analytics 4 / orgánico web (stub)
  ga4: {
    propertyId: optional('GA4_PROPERTY_ID'),
    serviceAccountJson: optional('GA4_SERVICE_ACCOUNT_JSON'),
    accessToken: optional('GA4_ACCESS_TOKEN'),
  },

  // Instagram orgánico (stub)
  instagramOrganic: {
    graphToken: optional('INSTAGRAM_GRAPH_TOKEN'),
    businessAccountId: optional('INSTAGRAM_BUSINESS_ACCOUNT_ID'),
  },

  // WhatsApp métricas de conversación (stub; distinto de Whapi reuniones)
  whatsappMetrics: {
    token: optional('WHATSAPP_METRICS_TOKEN'),
    phoneNumberId: optional('WHATSAPP_PHONE_NUMBER_ID'),
  },

  // Google Calendar / Calendly
  calendar: {
    provider: process.env.CALENDAR_PROVIDER || 'google',
    googleClientId: optional('GOOGLE_CALENDAR_CLIENT_ID'),
    googleClientSecret: optional('GOOGLE_CALENDAR_CLIENT_SECRET'),
    googleRefreshToken: optional('GOOGLE_CALENDAR_REFRESH_TOKEN'),
  },

  // Auth JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  },

  // API Key para integraciones externas (Zapier, Make, etc.)
  apiKey: optional('ZAPIER_API_KEY'),
};
