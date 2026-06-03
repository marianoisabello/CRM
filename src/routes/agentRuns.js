'use strict';

const express = require('express');
const router = express.Router();
const supabase = require('../db/client');
const { processLead } = require('../agents/sdr');
const { generateDiagnosis } = require('../agents/analyst');
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
    res.json({ ok: true, message: 'Analista iniciado en background', lead_id });
    generateDiagnosis(lead_id, meeting_notes).catch(err => logger.error({ msg: 'Error analista manual', error: err.message }));
  } catch (err) {
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

// POST /api/agent-runs/performance  { since, until }
router.post('/performance', async (req, res) => {
  const { since, until } = req.body;
  if (!since || !until) return res.status(400).json({ ok: false, error: 'since y until requeridos (YYYY-MM-DD)' });

  res.json({ ok: true, message: 'Análisis de performance iniciado en background' });
  analyzePerformance(since, until).catch(err => logger.error({ msg: 'Error performance manual', error: err.message }));
});

// POST /api/agent-runs/reporting  { client_id, month }
router.post('/reporting', async (req, res) => {
  const { client_id, month } = req.body;
  if (!client_id || !month) return res.status(400).json({ ok: false, error: 'client_id y month (YYYY-MM) requeridos' });

  res.json({ ok: true, message: 'Reporte mensual iniciado en background' });
  generateMonthlyReport(client_id, month).catch(err => logger.error({ msg: 'Error reporting manual', error: err.message }));
});

module.exports = router;
