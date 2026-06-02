'use strict';

const express = require('express');
const path = require('path');
const cron = require('node-cron');
const config = require('./config');
const logger = require('./lib/logger');

// Rutas
const leadsRouter = require('./routes/leads');
const ingestRouter = require('./routes/ingest');
const meetingsRouter = require('./routes/meetings');
const diagnosisRouter = require('./routes/diagnosis');
const proposalsRouter = require('./routes/proposals');
const campaignsRouter = require('./routes/campaigns');
const reportsRouter = require('./routes/reports');

// Jobs
const { runFollowups } = require('./jobs/followups');
const { runWeeklyAdsOptimization } = require('./jobs/adsOptimize.weekly');
const { runMonthlyReports } = require('./jobs/monthlyReport');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Rutas de la API
app.use('/api/leads', leadsRouter);
app.use('/api/leads', ingestRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/diagnosis', diagnosisRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/reports', reportsRouter);

// 404
app.use((_req, res) => res.status(404).json({ ok: false, error: 'Ruta no encontrada' }));

// Error handler global
app.use((err, _req, res, _next) => {
  logger.error({ msg: 'Error no manejado', error: err.message, stack: err.stack });
  res.status(500).json({ ok: false, error: 'Error interno del servidor' });
});

// ─── Jobs programados ────────────────────────────────────────────────────────
// Solo en producción o si se fuerza con START_JOBS=true
if (config.nodeEnv === 'production' || process.env.START_JOBS === 'true') {
  // Follow-ups: todos los días a las 9:00 AM
  cron.schedule('0 9 * * *', () => {
    runFollowups().catch((err) => logger.error({ msg: 'Cron follow-ups falló', error: err.message }));
  });

  // Optimización de ads: lunes 8:00 AM
  cron.schedule('0 8 * * 1', () => {
    runWeeklyAdsOptimization().catch((err) => logger.error({ msg: 'Cron ads optimization falló', error: err.message }));
  });

  // Reportes mensuales: día 1 de cada mes a las 7:00 AM
  cron.schedule('0 7 1 * *', () => {
    runMonthlyReports().catch((err) => logger.error({ msg: 'Cron monthly reports falló', error: err.message }));
  });

  logger.info({ msg: 'Jobs cron activados' });
}

app.listen(config.port, () => {
  logger.info({ msg: 'CRM Dana iniciado', port: config.port, env: config.nodeEnv });
});

module.exports = app;
