'use strict';

const express = require('express');
const router = express.Router();
const { analyzePerformance } = require('../agents/performance');
const {
  listPerformanceReports,
  getPerformanceReport,
  approvePerformanceReport,
} = require('../db/campaigns');
const logger = require('../lib/logger');

/**
 * GET /api/campaigns/reports
 * Lista reportes de performance.
 */
router.get('/reports', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;
    const reports = await listPerformanceReports({
      limit: Number(limit),
      offset: Number(offset),
      status: status || undefined,
    });
    return res.json({ ok: true, reports, count: reports.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/campaigns/reports/:id
 */
router.get('/reports/:id', async (req, res) => {
  try {
    const report = await getPerformanceReport(req.params.id);
    return res.json({ ok: true, report });
  } catch (err) {
    return res.status(404).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/campaigns/analyze
 * Body: { since, until, client_id? }
 */
router.post('/analyze', async (req, res) => {
  const { since, until, client_id } = req.body || {};
  if (!since || !until) {
    return res.status(400).json({ ok: false, error: 'since y until (YYYY-MM-DD) son requeridos' });
  }

  try {
    logger.info({ msg: 'Análisis de performance iniciado', since, until, client_id });
    const analysis = await analyzePerformance(since, until, client_id || null);
    return res.json({ ok: true, analysis });
  } catch (err) {
    logger.error({ msg: 'Error en análisis de performance', error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/campaigns/reports/:id/approve
 * Aprobación humana de acciones pendientes del reporte de performance.
 */
router.post('/reports/:id/approve', async (req, res) => {
  try {
    const report = await approvePerformanceReport(req.params.id);
    logger.info({ msg: 'Performance report aprobado', reportId: req.params.id });
    return res.json({ ok: true, report });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
