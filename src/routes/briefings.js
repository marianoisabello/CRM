/**
 * Agente 04 — CRUD + generate briefings
 */
'use strict';

const express = require('express');
const router = express.Router();
const supabase = require('../db/client');
const logger = require('../lib/logger');
const { generateBriefing, updateStatus, processInteresados } = require('../agents/briefing');

// GET /api/agent-runs/briefings
router.get('/', async (req, res) => {
  const { limit = 50, offset = 0, q, status } = req.query;
  let query = supabase
    .from('briefings')
    .select(
      'id, lead_email, lead_id, perfil_email, reunion_id, propuesta_id, objetivo_cliente, ' +
        'servicios_sugeridos, presupuesto_estimado, plazo, kpis, riesgos_detectados, ' +
        'diferenciadores, resumen_ejecutivo, brief_completo_url, version, status, ' +
        'error_message, created_at, updated_at'
    )
    .order('updated_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (status) query = query.eq('status', String(status).toUpperCase());
  if (q) {
    const safe = String(q).trim().replace(/[%*,()]/g, '').slice(0, 80);
    if (safe) {
      const term = `%${safe}%`;
      query = query.or(
        `lead_email.ilike.${term},objetivo_cliente.ilike.${term},resumen_ejecutivo.ilike.${term},presupuesto_estimado.ilike.${term}`
      );
    }
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true, briefings: data || [], count: (data || []).length });
});

// GET /api/agent-runs/briefings/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('briefings')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  if (!data) return res.status(404).json({ ok: false, error: 'No encontrado' });
  return res.json({ ok: true, briefing: data });
});

// POST /api/agent-runs/briefings/process-interesados — before :id
router.post('/process-interesados', async (req, res) => {
  const limit = Number(req.body?.limit) || 10;
  const maxAgeDays = Number(req.body?.maxAgeDays) || 14;
  try {
    res.json({ ok: true, message: 'Proceso interesados iniciado' });
    processInteresados({ limit, maxAgeDays })
      .then((r) => logger.info({ msg: 'Briefings interesados OK', ...r }))
      .catch((err) => logger.error({ msg: 'Error process-interesados', error: err.message }));
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/agent-runs/briefings — generate
// Body: { email?, lead_id?, force?: boolean }
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.email && !body.lead_id) {
      return res.status(400).json({ ok: false, error: 'email o lead_id requerido' });
    }

    // Sync generate so UI can show result; timeout risk on cold start — keep moderate
    const result = await generateBriefing({
      email: body.email || null,
      leadId: body.lead_id || null,
      force: Boolean(body.force),
    });
    return res.status(201).json({ ok: true, briefing: result.briefing, tokensUsed: result.tokensUsed });
  } catch (err) {
    logger.error({ msg: 'Error generando briefing', error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PATCH /api/agent-runs/briefings/:id/status  { status }
router.patch('/:id/status', async (req, res) => {
  try {
    const briefing = await updateStatus(req.params.id, req.body?.status);
    return res.json({ ok: true, briefing });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

// POST /api/agent-runs/briefings/:id/regenerate
router.post('/:id/regenerate', async (req, res) => {
  try {
    const { data: existing, error } = await supabase
      .from('briefings')
      .select('lead_email, lead_id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!existing) return res.status(404).json({ ok: false, error: 'No encontrado' });

    const result = await generateBriefing({
      email: existing.lead_email,
      leadId: existing.lead_id,
      force: true,
    });
    return res.json({ ok: true, briefing: result.briefing });
  } catch (err) {
    logger.error({ msg: 'Error regenerando briefing', error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/agent-runs/briefings/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('briefings').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true });
});

module.exports = router;
