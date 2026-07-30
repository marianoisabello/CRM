'use strict';

const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');
const config = require('../config');
const { handleIncomingMessage } = require('../agents/whatsappBot');

function verifyWebhookSecret(req) {
  const secret = config.whapi.webhookSecret;
  if (!secret) return true; // si no está configurado, se saltea la validación
  return req.query.secret === secret;
}

/**
 * POST /api/whatsapp/webhook
 * Recibe eventos de mensajes entrantes desde Whapi.Cloud (bot directo, sin ManyChat).
 * Responde 200 de inmediato; el bot procesa y contesta en background.
 */
router.post('/webhook', (req, res) => {
  if (!verifyWebhookSecret(req)) {
    logger.warn({ msg: 'Webhook Whapi rechazado: secret inválido', ip: req.ip });
    return res.status(401).json({ ok: false, error: 'secret inválido' });
  }

  const messages = req.body?.messages || [];
  res.status(200).json({ ok: true });

  for (const message of messages) {
    if (message.from_me) continue; // ignorar eco de mensajes salientes propios

    const phone = message.chat_id ? message.chat_id.split('@')[0] : message.from;
    const text =
      message.text?.body ||
      message.button?.text ||
      message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.title ||
      null;

    if (!phone || !text) continue;

    handleIncomingMessage({ phone, text, contactName: message.from_name || null }).catch((err) => {
      logger.error({ msg: 'Error procesando mensaje del bot de WhatsApp', phone, error: err.message });
    });
  }
});

module.exports = router;
