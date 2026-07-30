'use strict';

const express = require('express');
const router = express.Router();
const supabase = require('../db/client');
const { processLead } = require('../agents/sdr');
const { generateDiagnosis } = require('../agents/analyst');
const { processQualifiedLeads, enrichOne } = require('../agents/perfiles');
const { generateProposal } = require('../agents/proposal');
const { analyzePerformance } = require('../agents/performance');
const { generateMonthlyReport } = require('../agents/reporting');
const { getLead } = require('../db/leads');
const logger = require('../lib/logger');

// GET /api/agent-runs?agent_id=sdr&limit=20
router.get('/', async (req, res) => {
  const { agent_id, limit = 20, offset = 0 } = req.query;

  let query = supabase
    .from('agent_runs')
    .select('*, leads(name, email, source)')
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (agent_id) query = query.eq('agent_id', agent_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true, runs: data });
});

// POST /api/agent-runs/sdr  { lead_id }
router.post('/sdr', async (req, res) => {
  const { lead_id } = req.body;
  if (!lead_id) return res.status(400).json({ ok: false, error: 'lead_id requerido' });

  try {
    const lead = await getLead(lead_id);
    res.json({ ok: true, message: 'SDR iniciado en background', lead_id });
    processLead(lead).catch(err => logger.error({ msg: 'Error SDR manual', error: err.message }));
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/agent-runs/analyst  { lead_id, meeting_notes }
router.post('/analyst', async (req, res) => {
  const { lead_id, meeting_notes = '' } = req.body;
  if (!lead_id) return res.status(400).json({ ok: false, error: 'lead_id requerido' });

  try {
    await getLead(lead_id);
    res.json({ ok: true, message: 'Analista (diagnóstico) iniciado en background', lead_id });
    generateDiagnosis(lead_id, meeting_notes).catch(err => logger.error({ msg: 'Error analista manual', error: err.message }));
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/agent-runs/perfiles — lista perfiles enriquecidos (Agente 02)
router.get('/perfiles', async (req, res) => {
  const { limit = 100, offset = 0, q, categoria } = req.query;
  let query = supabase
    .from('perfiles')
    .select(
      'email, nombre, empresa, cargo, rubro, tamanio_empresa, sitio_web, ciudad, telefono, source, ' +
      'sdr_score, sdr_categoria, lead_id, pain_points_inferidos, servicios_recomendados, ' +
      'oferta_estimada, score_potencial, razones, objetivo_original, ' +
      'research_summary, research_context, ' +
      'propuesta_id, propuesta_origen, propuesta_notas, propuesta_asignada_at, updated_at'
    )
    .order('score_potencial', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (categoria) query = query.ilike('sdr_categoria', String(categoria).trim());
  if (q) {
    const safe = String(q).trim().replace(/[%*,()]/g, '').slice(0, 80);
    if (safe) {
      const term = `%${safe}%`;
      query = query.or(`email.ilike.${term},nombre.ilike.${term},empresa.ilike.${term}`);
    }
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true, perfiles: data || [], count: (data || []).length });
});

// POST /api/agent-runs/perfiles  — batch Analista MVP (perfiles)
// Body: { maxAgeDays?: 30, limit?: 40 }
router.post('/perfiles', async (req, res) => {
  const { maxAgeDays = 30, limit = 40 } = req.body || {};
  try {
    res.json({ ok: true, message: 'Agente Perfiles iniciado en background' });
    processQualifiedLeads({ maxAgeDays, limit })
      .then((result) => logger.info({ msg: 'Perfiles batch OK', ...result }))
      .catch((err) => logger.error({ msg: 'Error perfiles batch', error: err.message }));
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/agent-runs/perfiles/one  { email } | { lead_id }
router.post('/perfiles/one', async (req, res) => {
  try {
    const { email, lead_id } = req.body || {};
    let row = null;
    if (lead_id) {
      const { data, error } = await supabase.from('leads').select('*').eq('id', lead_id).maybeSingle();
      if (error) throw new Error(error.message);
      row = data;
    } else if (email) {
      const { data, error } = await supabase.from('leads').select('*').eq('email', String(email).toLowerCase()).limit(1);
      if (error) throw new Error(error.message);
      row = (data && data[0]) || null;
    } else {
      return res.status(400).json({ ok: false, error: 'email o lead_id requerido' });
    }
    if (!row) return res.status(404).json({ ok: false, error: 'Lead no encontrado' });
    const { perfil } = await enrichOne(row);
    return res.json({ ok: true, perfil });
  } catch (err) {
    logger.error({ msg: 'Error perfiles/one', error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/agent-runs/proposal  { lead_id, call_notes, budget_estimate }
router.post('/proposal', async (req, res) => {
  const { lead_id, call_notes = '', budget_estimate } = req.body;
  if (!lead_id) return res.status(400).json({ ok: false, error: 'lead_id requerido' });

  try {
    res.json({ ok: true, message: 'Propuesta iniciada en background', lead_id });
    generateProposal(lead_id, { callNotes: call_notes, budgetEstimate: budget_estimate })
      .catch(err => logger.error({ msg: 'Error propuesta manual', error: err.message }));
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/agent-runs/performance  { since, until, client_id?, channels? }
router.post('/performance', async (req, res) => {
  const { since, until, client_id, channels } = req.body || {};
  if (!since || !until) return res.status(400).json({ ok: false, error: 'since y until requeridos (YYYY-MM-DD)' });

  try {
    const analysis = await analyzePerformance(since, until, client_id || null, channels || null);
    return res.json({ ok: true, message: 'Análisis de performance completado', analysis });
  } catch (err) {
    logger.error({ msg: 'Error performance manual', error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/agent-runs/reporting  { client_id, month, team_notes? }
router.post('/reporting', async (req, res) => {
  const { client_id, month, team_notes } = req.body || {};
  if (!client_id || !month) return res.status(400).json({ ok: false, error: 'client_id y month (YYYY-MM) requeridos' });

  try {
    const report = await generateMonthlyReport(client_id, month, team_notes || '');
    return res.json({ ok: true, message: 'Reporte mensual generado', report, status: 'pending_approval' });
  } catch (err) {
    logger.error({ msg: 'Error reporting manual', error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
