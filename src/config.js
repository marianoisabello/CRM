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
};
