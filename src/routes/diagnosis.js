'use strict';

const express = require('express');
const router = express.Router();
const { generateDiagnosis } = require('../agents/analyst');
const { getLead } = require('../db/leads');
const logger = require('../lib/logger');

/**
 * POST /api/diagnosis
 * Body: { lead_id, meeting_notes }
 * Dispara el Agente 02 (Analista) para generar el diagnóstico.
 */
router.post('/', async (req, res) => {
  const { lead_id, meeting_notes } = req.body;
  if (!lead_id) return res.status(400).json({ ok: false, error: 'lead_id requerido' });

  try {
    const lead = await getLead(lead_id);
    if (!['new', 'contacted', 'qualified'].includes(lead.status)) {
      return res.status(400).json({ ok: false, error: `Lead en estado "${lead.status}" no apto para diagnóstico` });
    }

    logger.info({ msg: 'Iniciando diagnóstico', leadId: lead_id });
    const diagnosis = await generateDiagnosis(lead_id, meeting_notes || '');
    return res.json({ ok: true, diagnosis });
  } catch (err) {
    logger.error({ msg: 'Error en diagnóstico', leadId: lead_id, error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/diagnosis/:lead_id
 * Devuelve el diagnóstico guardado en el lead.
 */
router.get('/:lead_id', async (req, res) => {
  try {
    const lead = await getLead(req.params.lead_id);
    if (!lead.diagnosis) {
      return res.status(404).json({ ok: false, error: 'Este lead no tiene diagnóstico aún' });
    }
    return res.json({ ok: true, diagnosis: lead.diagnosis });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
