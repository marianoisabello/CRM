'use strict';

const express = require('express');
const router = express.Router();
const { generateMonthlyReport } = require('../agents/reporting');
const {
  listMonthlyReports,
  getMonthlyReport,
  approveMonthlyReport,
  markMonthlyReportSent,
} = require('../db/campaigns');
const { listClients } = require('../db/clients');
const logger = require('../lib/logger');

/**
 * GET /api/reports/clients — clientes activos para el selector del agente
 */
router.get('/clients', async (req, res) => {
  try {
    const status = req.query.status || 'active';
    const clients = await listClients({ status });
    return res.json({ ok: true, clients });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/reports — lista reportes mensuales
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, client_id } = req.query;
    const reports = await listMonthlyReports({
      limit: Number(limit),
      offset: Number(offset),
      status: status || undefined,
      client_id: client_id || undefined,
    });
    return res.json({ ok: true, reports, count: reports.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/reports/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const report = await getMonthlyReport(req.params.id);
    return res.json({ ok: true, report });
  } catch (err) {
    return res.status(404).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/reports/monthly
 * Body: { client_id, month (YYYY-MM), team_notes? }
 */
router.post('/monthly', async (req, res) => {
  const { client_id, month, team_notes } = req.body || {};
  if (!client_id || !month) {
    return res.status(400).json({ ok: false, error: 'client_id y month (YYYY-MM) son requeridos' });
  }

  try {
    logger.info({ msg: 'Generando reporte mensual', client_id, month });
    const report = await generateMonthlyReport(client_id, month, team_notes || '');
    return res.json({ ok: true, report, status: 'pending_approval' });
  } catch (err) {
    logger.error({ msg: 'Error generando reporte mensual', error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/reports/:id/approve
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const report = await approveMonthlyReport(req.params.id);
    logger.info({ msg: 'Reporte mensual aprobado', reportId: req.params.id });
    return res.json({ ok: true, report });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/reports/:id/sent — marca como enviado al cliente
 */
router.post('/:id/sent', async (req, res) => {
  try {
    const report = await markMonthlyReportSent(req.params.id);
    return res.json({ ok: true, report });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
