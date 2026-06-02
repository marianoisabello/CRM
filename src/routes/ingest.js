'use strict';

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const logger = require('../lib/logger');
const { getNormalizer, VALID_SOURCES } = require('../normalizers');
const { createIngestEvent, markProcessed, markFailed, getUnprocessed } = require('../db/ingestEvents');
const { upsertLead } = require('../db/leads');
const { processLead } = require('../agents/sdr');

function verifyManychatSignature(req) {
  const secret = process.env.MANYCHAT_WEBHOOK_SECRET;
  if (!secret) return true; // si no está configurado, se saltea la validación
  const signature = req.headers['x-hub-signature-256'] || req.headers['x-manychat-signature'];
  if (!signature) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * POST /api/leads/ingest?source=<source>
 *
 * Flujo:
 * 1. Guarda IngestEvent crudo.
 * 2. Normaliza según fuente.
 * 3. Upsert Lead.
 * 4. Dispara SDR (Agente 01) en background — no bloquea la respuesta.
 * 5. Si falla 2-3: marca error en IngestEvent, devuelve 200 igual.
 */
router.post('/ingest', async (req, res) => {
  const source = req.query.source;
  const rawPayload = req.body;

  logger.info({ msg: 'Ingesta recibida', source, keys: Object.keys(rawPayload || {}) });

  if (!source) {
    return res.status(400).json({ ok: false, error: 'Parámetro "source" requerido' });
  }

  if (source === 'manychat' && !verifyManychatSignature(req)) {
    logger.warn({ msg: 'ManyChat: firma inválida rechazada', ip: req.ip });
    return res.status(401).json({ ok: false, error: 'Firma inválida' });
  }

  if (!VALID_SOURCES.includes(source)) {
    return res.status(400).json({
      ok: false,
      error: `Fuente inválida: "${source}". Válidas: ${VALID_SOURCES.join(', ')}`,
    });
  }

  // Paso 1: guardar evento crudo siempre
  let ingestEvent;
  try {
    ingestEvent = await createIngestEvent(source, rawPayload);
    logger.info({ msg: 'IngestEvent guardado', eventId: ingestEvent.id, source });
  } catch (err) {
    logger.error({ msg: 'Error crítico guardando IngestEvent', error: err.message, source });
    return res.status(500).json({ ok: false, error: 'Error interno guardando evento' });
  }

  // Pasos 2-3: normalizar y crear/actualizar Lead
  let lead;
  try {
    const normalizer = getNormalizer(source);
    const normalized = normalizer.normalize(rawPayload);
    const { lead: savedLead, created } = await upsertLead(normalized);
    lead = savedLead;

    await markProcessed(ingestEvent.id);
    logger.info({
      msg: created ? 'Lead creado' : 'Lead actualizado',
      leadId: lead.id,
      source,
      eventId: ingestEvent.id,
    });
  } catch (err) {
    logger.error({ msg: 'Error normalizando/guardando Lead', error: err.message, source, eventId: ingestEvent.id });
    await markFailed(ingestEvent.id, err.message).catch(() => {});
    return res.status(200).json({
      ok: false,
      error: 'Error procesando lead; evento crudo guardado para reprocesamiento',
      event_id: ingestEvent.id,
    });
  }

  // Responder de inmediato — el SDR corre en background
  res.status(200).json({ ok: true, lead_id: lead.id, event_id: ingestEvent.id });

  // Paso 4: SDR en background (no bloquea la respuesta al cliente)
  processLead(lead).catch((err) => {
    logger.error({ msg: 'Error en SDR background', leadId: lead.id, error: err.message });
  });
});

/**
 * POST /api/leads/reprocess
 * Re-ejecuta normalización + SDR sobre IngestEvents con processed=false.
 */
router.post('/reprocess', async (req, res) => {
  logger.info({ msg: 'Iniciando reprocesamiento de eventos fallidos' });

  let events;
  try {
    events = await getUnprocessed();
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }

  const results = { processed: 0, failed: 0, errors: [] };

  for (const event of events) {
    try {
      const normalizer = getNormalizer(event.source);
      const normalized = normalizer.normalize(event.raw_payload);
      const { lead } = await upsertLead(normalized);
      await markProcessed(event.id);
      results.processed++;

      // SDR en background también en reprocesamiento
      processLead(lead).catch((err) => {
        logger.error({ msg: 'Error en SDR durante reprocessing', leadId: lead.id, error: err.message });
      });
    } catch (err) {
      await markFailed(event.id, err.message).catch(() => {});
      results.failed++;
      results.errors.push({ eventId: event.id, error: err.message });
    }
  }

  return res.status(200).json({ ok: true, total: events.length, ...results });
});

module.exports = router;
