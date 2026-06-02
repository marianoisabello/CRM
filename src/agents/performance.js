'use strict';

/**
 * Agente 04 — Performance / Ads
 * Corre DENTRO del CRM como job semanal programado.
 * Lee métricas de Meta Ads y Google Ads, recomienda optimizaciones.
 * Acciones irreversibles (pausar campaña, reasignar presupuesto) requieren confirmación humana.
 */

const fs = require('fs');
const path = require('path');
const { callClaude } = require('../integrations/ai');
const { getCampaignInsights } = require('../integrations/meta');
const { getCampaignPerformance } = require('../integrations/googleAds');
const { savePerformanceReport } = require('../db/campaigns');
const AgentRun = require('../lib/agentRun');
const logger = require('../lib/logger');

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '../prompts/performance.txt'),
  'utf8'
);

/**
 * Analiza el rendimiento de ads de un período y guarda recomendaciones.
 * @param {string} since - YYYY-MM-DD
 * @param {string} until - YYYY-MM-DD
 * @param {string} [clientId] - si es null, analiza todas las cuentas
 */
async function analyzePerformance(since, until, clientId = null) {
  const run = await AgentRun.start('performance', {
    inputData: { since, until, clientId },
  });

  try {
    // Recolectar métricas de ambas plataformas en paralelo
    const [metaData, googleData] = await Promise.allSettled([
      getCampaignInsights({ since, until }).catch((err) => {
        logger.warn({ msg: 'Meta Ads no disponible', error: err.message });
        return [];
      }),
      getCampaignPerformance(since, until).catch((err) => {
        logger.warn({ msg: 'Google Ads no disponible', error: err.message });
        return [];
      }),
    ]);

    const metricsPayload = {
      period: `${since} / ${until}`,
      meta_ads: metaData.status === 'fulfilled' ? metaData.value : [],
      google_ads: googleData.status === 'fulfilled' ? googleData.value : [],
    };

    const { text, tokensUsed } = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: JSON.stringify(metricsPayload, null, 2),
      maxTokens: 1500,
      context: `performance.${since}`,
    });

    const analysis = parseResponse(text);

    // Guardar reporte — las acciones que requieren aprobación quedan en estado "pending"
    await savePerformanceReport({
      period_since: since,
      period_until: until,
      client_id: clientId,
      analysis,
      actions_pending_approval: analysis.actions_pending_approval || [],
    });

    logger.info({
      msg: 'Performance analizado',
      period: `${since}/${until}`,
      alerts: analysis.alerts?.length,
      pendingActions: analysis.actions_pending_approval?.length,
    });

    await run.complete({ outputData: analysis, tokensUsed });
    return analysis;
  } catch (err) {
    await run.fail(err);
    throw err;
  }
}

function parseResponse(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Sin JSON en respuesta');
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { raw_response: text, alerts: [], recommendations: [] };
  }
}

module.exports = { analyzePerformance };
