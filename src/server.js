'use strict';

const express = require('express');
const path = require('path');
const cron = require('node-cron');
const config = require('./config');
const logger = require('./lib/logger');
const { requireAuth } = require('./middleware/auth');

// Rutas públicas
const authRouter = require('./routes/auth');

// Rutas protegidas
const leadsRouter = require('./routes/leads');
const ingestRouter = require('./routes/ingest');
const meetingsRouter = require('./routes/meetings');
const diagnosisRouter = require('./routes/diagnosis');
const proposalsRouter = require('./routes/proposals');
const campaignsRouter = require('./routes/campaigns');
const reportsRouter = require('./routes/reports');
const agentRunsRouter = require('./routes/agentRuns');
const exportRouter = require('./routes/export');

// Jobs
const { runFollowups } = require('./jobs/followups');
const { runWeeklyAdsOptimization } = require('./jobs/adsOptimize.weekly');
const { runMonthlyReports } = require('./jobs/monthlyReport');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Health check — público
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Auth — público
app.use('/api/auth', authRouter);

// Ingesta — público (las fuentes externas no mandan token)
app.use('/api/leads/ingest', ingestRouter);
app.use('/api/leads/reprocess', ingestRouter);

// Todo lo demás requiere auth
app.use('/api', requireAuth);
app.use('/api/auth/me', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/diagnosis', diagnosisRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/agent-runs', agentRunsRouter);
app.use('/api/export', exportRouter);

// 404
app.use((_req, res) => res.status(404).json({ ok: false, error: 'Ruta no encontrada' }));

// Error handler global
app.use((err, _req, res, _next) => {
  logger.error({ msg: 'Error no manejado', error: err.message, stack: err.stack });
  res.status(500).json({ ok: false, error: 'Error interno del servidor' });
});

// ─── Jobs programados ─────────────────────────────────────────────────────────
if (config.nodeEnv === 'production' || process.env.START_JOBS === 'true') {
  cron.schedule('0 9 * * *', () => {
    runFollowups().catch(err => logger.error({ msg: 'Cron follow-ups falló', error: err.message }));
  });
  cron.schedule('0 8 * * 1', () => {
    runWeeklyAdsOptimization().catch(err => logger.error({ msg: 'Cron ads optimization falló', error: err.message }));
  });
  cron.schedule('0 7 1 * *', () => {
    runMonthlyReports().catch(err => logger.error({ msg: 'Cron monthly reports falló', error: err.message }));
  });
  logger.info({ msg: 'Jobs cron activados' });
}

app.listen(config.port, () => {
  logger.info({ msg: 'CRM Dana iniciado', port: config.port, env: config.nodeEnv });
});

module.exports = app;
