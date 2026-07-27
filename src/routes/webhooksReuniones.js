/**
 * Public webhooks for Agente 03 ingest (Zoom / Google / WhatsApp).
 * Separate from SDR Whapi webhooks — do not overwrite those.
 */
'use strict';

const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');
const { createPending, analyzeReunion } = require('../agents/reuniones');

function authorize(req) {
  const expected = process.env.CRM_INTERNAL_KEY || process.env.JWT_SECRET;
  const got = req.headers['x-crm-internal-key'];
  if (expected && got === expected) return true;

  const zoomSecret = process.env.ZOOM_WEBHOOK_SECRET;
  if (zoomSecret && req.headers['authorization'] === `Bearer ${zoomSecret}`) return true;
  if (zoomSecret && req.headers['x-zoom-token'] === zoomSecret) return true;

  // Zoom URL validation challenge has no secret yet on first setup — allow only that path shape
  if (req.body?.event === 'endpoint.url_validation') return true;

  return false;
}

function extractTranscript(body) {
  if (!body || typeof body !== 'object') return '';
  return (
    body.transcript ||
    body.transcript_text ||
    body.text ||
    body.notes ||
    body.content ||
    body.message?.text ||
    body.payload?.object?.recording_files?.find?.((f) => f.file_type === 'TRANSCRIPT')?.download_url ||
    ''
  );
}

async function ingestAndMaybeAnalyze(payload, { autoAnalyze = true } = {}) {
  const reunion = await createPending(payload);
  if (autoAnalyze && reunion.transcript && String(reunion.transcript).trim().length > 40) {
    analyzeReunion(reunion.id).catch((err) =>
      logger.error({ msg: 'Webhook analyze falló', id: reunion.id, error: err.message })
    );
  }
  return reunion;
}

// POST /api/hooks/reuniones/zoom
router.post('/zoom', async (req, res) => {
  // Zoom endpoint validation
  if (req.body?.event === 'endpoint.url_validation') {
    const plainToken = req.body?.payload?.plainToken;
    const secret = process.env.ZOOM_WEBHOOK_SECRET || '';
    if (plainToken && secret) {
      const crypto = require('crypto');
      const encryptedToken = crypto
        .createHmac('sha256', secret)
        .update(plainToken)
        .digest('hex');
      return res.json({ plainToken, encryptedToken });
    }
    return res.json({ plainToken: plainToken || '', encryptedToken: '' });
  }

  if (!authorize(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  try {
    const body = req.body || {};
    const obj = body.payload?.object || body.object || body;
    const transcript = typeof extractTranscript(body) === 'string' ? extractTranscript(body) : '';
    const recordingUrl =
      body.recording_url ||
      obj.share_url ||
      obj.recording_files?.[0]?.download_url ||
      null;

    const reunion = await ingestAndMaybeAnalyze({
      source: 'zoom',
      external_id: String(obj.uuid || obj.id || body.event_ts || Date.now()),
      titulo: obj.topic || body.titulo || 'Reunión Zoom',
      fecha: obj.start_time || body.fecha || new Date().toISOString(),
      duracion_min: obj.duration || body.duracion_min || null,
      transcript: typeof transcript === 'string' && !transcript.startsWith('http') ? transcript : null,
      transcript_url: typeof transcript === 'string' && transcript.startsWith('http') ? transcript : null,
      recording_url: recordingUrl,
      lead_email: body.lead_email || obj.host_email || null,
      participantes: (obj.participant_email || []).map?.((e) => e) || body.participantes || [],
      raw_payload: { event: body.event || 'zoom_webhook', received_at: new Date().toISOString() },
    }, { autoAnalyze: Boolean(transcript && !String(transcript).startsWith('http')) });

    return res.json({ ok: true, reunion_id: reunion.id, status: reunion.status });
  } catch (err) {
    logger.error({ msg: 'Zoom webhook error', error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/hooks/reuniones/google
router.post('/google', async (req, res) => {
  if (!authorize(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  try {
    const body = req.body || {};
    const transcript = extractTranscript(body);
    const reunion = await ingestAndMaybeAnalyze({
      source: 'google_meet',
      external_id: String(body.conferenceId || body.eventId || body.id || Date.now()),
      titulo: body.summary || body.titulo || 'Google Meet',
      fecha: body.start || body.fecha || new Date().toISOString(),
      duracion_min: body.duracion_min || null,
      transcript: transcript || null,
      recording_url: body.recording_url || body.hangoutLink || null,
      lead_email: body.lead_email || body.attendee_email || null,
      participantes: body.participantes || body.attendees || [],
      raw_payload: { received_at: new Date().toISOString() },
    });
    return res.json({ ok: true, reunion_id: reunion.id, status: reunion.status });
  } catch (err) {
    logger.error({ msg: 'Google webhook error', error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * WhatsApp / Whapi — dedicated path for meeting/chat analysis.
 * Does NOT replace SDR webhook. Forward only selected chats here.
 * Body examples:
 *  { transcript, lead_phone, lead_email }
 *  { messages: [{ from, body, timestamp }], chat_id }
 */
router.post('/whatsapp', async (req, res) => {
  if (!authorize(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  try {
    const body = req.body || {};

    // Ignore status / from_me noise if Whapi payload forwarded raw
    if (body.from_me === true || body.event?.type === 'statuses') {
      return res.json({ ok: true, skipped: true, reason: 'not_inbound_chat' });
    }

    let transcript = extractTranscript(body);
    if (!transcript && Array.isArray(body.messages)) {
      transcript = body.messages
        .map((m) => {
          const who = m.from_me ? 'Agente' : m.from || m.author || 'Lead';
          const text = m.text?.body || m.body || m.text || '';
          return `${who}: ${text}`;
        })
        .filter((l) => l.length > 3)
        .join('\n');
    }
    if (!transcript && body.text?.body) {
      transcript = String(body.text.body);
    }

    if (!transcript || String(transcript).trim().length < 20) {
      return res.status(400).json({ ok: false, error: 'transcript/messages insuficientes' });
    }

    const phone =
      body.lead_phone ||
      body.from ||
      body.chat_id ||
      body.messages?.[0]?.from ||
      null;

    const reunion = await ingestAndMaybeAnalyze({
      source: 'whatsapp',
      external_id: String(body.message_id || body.id || body.chat_id || `${phone}-${Date.now()}`),
      titulo: body.titulo || `WhatsApp ${phone || ''}`.trim(),
      fecha: body.timestamp
        ? new Date(Number(body.timestamp) * 1000).toISOString()
        : new Date().toISOString(),
      transcript: String(transcript).slice(0, 200000),
      lead_phone: phone ? String(phone) : null,
      lead_email: body.lead_email || null,
      raw_payload: { received_at: new Date().toISOString(), whapi: true },
    });

    return res.json({ ok: true, reunion_id: reunion.id, status: reunion.status });
  } catch (err) {
    logger.error({ msg: 'WhatsApp reuniones webhook error', error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/hooks/reuniones/process-pending — n8n schedule
router.post('/process-pending', async (req, res) => {
  if (!authorize(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  const { processPending } = require('../agents/reuniones');
  const limit = Number(req.body?.limit) || 10;
  res.json({ ok: true, message: 'Pending iniciado' });
  processPending({ limit }).catch((err) =>
    logger.error({ msg: 'Hook process-pending falló', error: err.message })
  );
});

module.exports = router;
