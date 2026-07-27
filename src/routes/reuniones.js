/**
 * Agente 03 — CRUD + analyze reuniones
 */
'use strict';

const express = require('express');
const router = express.Router();
const supabase = require('../db/client');
const logger = require('../lib/logger');
const { createPending, analyzeReunion, processPending } = require('../agents/reuniones');

// GET /api/agent-runs/reuniones
router.get('/', async (req, res) => {
  const { limit = 50, offset = 0, q, status, source } = req.query;
  let query = supabase
    .from('reuniones')
    .select(
      'id, fecha, duracion_min, participantes, lead_email, lead_phone, lead_id, titulo, ' +
        'resumen, pain_points, objeciones, nivel_interes, senales_compra, proximos_pasos, ' +
        'frases_destacadas, score_cierre, source, status, recording_url, transcript_url, ' +
        'error_message, created_at, updated_at'
    )
    .order('updated_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (status) query = query.eq('status', String(status));
  if (source) query = query.eq('source', String(source));
  if (q) {
    const safe = String(q).trim().replace(/[%*,()]/g, '').slice(0, 80);
    if (safe) {
      const term = `%${safe}%`;
      query = query.or(
        `lead_email.ilike.${term},titulo.ilike.${term},resumen.ilike.${term},lead_phone.ilike.${term}`
      );
    }
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true, reuniones: data || [], count: (data || []).length });
});

// GET /api/agent-runs/reuniones/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('reuniones')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  if (!data) return res.status(404).json({ ok: false, error: 'No encontrada' });
  return res.json({ ok: true, reunion: data });
});

// POST /api/agent-runs/reuniones/process-pending — batch (before :id)
router.post('/process-pending', async (req, res) => {
  const limit = Number(req.body?.limit) || 10;
  try {
    res.json({ ok: true, message: 'Proceso pending iniciado' });
    processPending({ limit })
      .then((r) => logger.info({ msg: 'Pending reuniones OK', ...r }))
      .catch((err) => logger.error({ msg: 'Error process-pending', error: err.message }));
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/agent-runs/reuniones — create (manual upload of transcript)
// Body: { transcript, titulo?, lead_email?, lead_phone?, fecha?, source?, recording_url?, analyze?: true }
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.transcript || !String(body.transcript).trim()) {
      return res.status(400).json({ ok: false, error: 'transcript requerido' });
    }

    const reunion = await createPending({
      transcript: String(body.transcript).slice(0, 200000),
      titulo: body.titulo || null,
      lead_email: body.lead_email || null,
      lead_phone: body.lead_phone || null,
      fecha: body.fecha || new Date().toISOString(),
      duracion_min: body.duracion_min,
      participantes: body.participantes,
      recording_url: body.recording_url || null,
      transcript_url: body.transcript_url || null,
      source: body.source || 'manual',
      external_id: body.external_id || null,
      raw_payload: { uploaded_by: req.user?.email || null },
    });

    if (body.analyze === false) {
      return res.status(201).json({ ok: true, reunion });
    }

    res.status(201).json({ ok: true, message: 'Análisis iniciado', reunion_id: reunion.id, reunion });
    analyzeReunion(reunion.id)
      .then((r) => logger.info({ msg: 'Reunión analizada', id: reunion.id, score: r.reunion?.score_cierre }))
      .catch((err) => logger.error({ msg: 'Error análisis reunión', id: reunion.id, error: err.message }));
  } catch (err) {
    logger.error({ msg: 'Error creando reunión', error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/agent-runs/reuniones/:id/analyze
router.post('/:id/analyze', async (req, res) => {
  const force = Boolean(req.body?.force);
  try {
    res.json({ ok: true, message: 'Análisis iniciado', reunion_id: req.params.id });
    analyzeReunion(req.params.id, { force })
      .catch((err) => logger.error({ msg: 'Error análisis reunión', id: req.params.id, error: err.message }));
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/agent-runs/reuniones/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('reuniones').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true });
});

module.exports = router;
