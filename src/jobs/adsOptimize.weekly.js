'use strict';

/**
 * Job: Análisis de performance semanal de ads (Agente 04)
 * Se corre los lunes a las 8:00 AM con los datos de la semana anterior.
 */

const { analyzePerformance } = require('../agents/performance');
const logger = require('../lib/logger');

async function runWeeklyAdsOptimization() {
  const until = new Date();
  until.setDate(until.getDate() - 1); // ayer

  const since = new Date();
  since.setDate(since.getDate() - 8); // hace 8 días

  const fmt = (d) => d.toISOString().split('T')[0];

  logger.info({ msg: 'Job ads optimization semanal iniciado', since: fmt(since), until: fmt(until) });

  try {
    await analyzePerformance(fmt(since), fmt(until));
    logger.info({ msg: 'Job ads optimization completado' });
  } catch (err) {
    logger.error({ msg: 'Error en job ads optimization', error: err.message });
  }
}

module.exports = { runWeeklyAdsOptimization };
