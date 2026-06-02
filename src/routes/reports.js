'use strict';

const express = require('express');
const router = express.Router();
const { generateMonthlyReport } = require('../agents/reporting');
const { approveMonthlyReport } = require('../db/campaigns');
const logger = require('../lib/logger');

/**
 * POST /api/reports/monthly
 * Body: { client_id, month (YYYY-MM), team_notes? }
 * Dispara el Agente 05 (Reporting) para generar el reporte mensual.
 */
router.post('/monthly', async (req, res) => {
  const { client_id, month, team_notes } = req.body;
  if (!client_id || !month) {
    return res.status(400).json({ ok: false, error: 'client_id y month (YYYY-MM) son requeridos' });
  }

  try {
    logger.info({ msg: 'Generando reporte mensual', client_id, month });
    const report = await generateMonthlyReport(client_id, month, team_notes);
    return res.json({ ok: true, report, status: 'pending_approval' });
  } catch (err) {
    logger.error({ msg: 'Error generando reporte mensual', error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/reports/:id/approve
 * Confirmación humana — habilita el envío del reporte al cliente.
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const report = await approveMonthlyReport(req.params.id);
    logger.info({ msg: 'Reporte mensual aprobado para distribución', reportId: req.params.id });
    return res.json({ ok: true, report });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
