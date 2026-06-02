'use strict';

const express = require('express');
const router = express.Router();
const { analyzePerformance } = require('../agents/performance');
const { approveMonthlyReport } = require('../db/campaigns');
const logger = require('../lib/logger');

/**
 * POST /api/campaigns/analyze
 * Body: { since, until, client_id? }
 * Dispara el Agente 04 (Performance) manualmente.
 */
router.post('/analyze', async (req, res) => {
  const { since, until, client_id } = req.body;
  if (!since || !until) {
    return res.status(400).json({ ok: false, error: 'since y until (YYYY-MM-DD) son requeridos' });
  }

  try {
    logger.info({ msg: 'Análisis de performance iniciado', since, until, client_id });
    const analysis = await analyzePerformance(since, until, client_id);
    return res.json({ ok: true, analysis });
  } catch (err) {
    logger.error({ msg: 'Error en análisis de performance', error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/campaigns/reports/:id/approve
 * Confirmación humana para aprobar acciones pendientes de un reporte de performance.
 */
router.post('/reports/:id/approve', async (req, res) => {
  try {
    const report = await approveMonthlyReport(req.params.id);
    logger.info({ msg: 'Reporte aprobado', reportId: req.params.id });
    return res.json({ ok: true, report });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
