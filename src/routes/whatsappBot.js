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
 *
 * Se espera (await) el procesamiento antes de responder: en funciones serverless de
 * Vercel el trabajo "fire-and-forget" lanzado después de res.json() puede cortarse
 * antes de completarse. El timeout de función (300s) da margen de sobra para esto.
 */
router.post('/webhook', async (req, res) => {
  if (!verifyWebhookSecret(req)) {
    logger.warn({ msg: 'Webhook Whapi rechazado: secret inválido', ip: req.ip });
    return res.status(401).json({ ok: false, error: 'secret inválido' });
  }

  // TEMPORAL: loguear el payload crudo para confirmar la forma real que manda Whapi
  logger.info({ msg: 'Whapi webhook payload crudo', body: req.body });

  const messages = req.body?.messages || [];

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

    try {
      await handleIncomingMessage({ phone, text, contactName: message.from_name || null });
    } catch (err) {
      logger.error({ msg: 'Error procesando mensaje del bot de WhatsApp', phone, error: err.message });
    }
  }

  res.status(200).json({ ok: true });
});

module.exports = router;
