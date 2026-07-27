'use strict';

/**
 * WhatsApp inbox metrics — stub. Export: getConversationMetrics.
 */
const config = require('../config');
const logger = require('../lib/logger');

async function getConversationMetrics(since, until) {
  const token =
    config.whatsappMetrics.token ||
    process.env.WHAPI_TOKEN ||
    config.manychat?.apiKey;
  if (!token) {
    throw new Error('WHATSAPP_METRICS_TOKEN / WHAPI_TOKEN / MANYCHAT_API_KEY no configuradas');
  }
  logger.warn({ msg: 'WhatsApp metrics live stub — sin filas aún', since, until });
  return [];
}

module.exports = { getConversationMetrics };
