'use strict';

/**
 * Agente Performance / Ads (context.md: Agente 04)
 * Lee métricas de Meta Ads y Google Ads (o demo si no hay credenciales),
 * recomienda optimizaciones. Acciones irreversibles requieren aprobación humana.
 */

const fs = require('fs');
const path = require('path');
const { callLlm, parseJsonLoose } = require('../integrations/llm');
const { getCampaignInsights } = require('../integrations/meta');
const { getCampaignPerformance } = require('../integrations/googleAds');
const { savePerformanceReport } = require('../db/campaigns');
const AgentRun = require('../lib/agentRun');
const logger = require('../lib/logger');

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '../prompts/performance.txt'),
  'utf8'
);

function demoMetrics(since, until) {
  return {
    meta_ads: [
      {
        campaign_name: '[DEMO] Meta · Prospecting Lookalike',
        impressions: 84200,
        clicks: 2105,
        spend: 1250.4,
        reach: 51200,
        cpm: 14.85,
        cpc: 0.59,
        ctr: 2.5,
        actions: [{ action_type: 'purchase', value: '38' }],
        note: 'Datos sintéticos — conectar META_ADS_* para métricas reales',
      },
      {
        campaign_name: '[DEMO] Meta · Retargeting 30d',
        impressions: 22100,
        clicks: 980,
        spend: 420.0,
        reach: 9800,
        cpm: 19.0,
        cpc: 0.43,
        ctr: 4.4,
        actions: [{ action_type: 'purchase', value: '52' }],
        note: 'Datos sintéticos',
      },
    ],
    google_ads: [
      {
        campaign: '[DEMO] Google · Brand Search',
        impressions: 15400,
        clicks: 1120,
        cost: 380.5,
        conversions: 41,
        ctr: 7.27,
        note: 'Datos sintéticos — conectar GOOGLE_ADS_* para métricas reales',
      },
      {
        campaign: '[DEMO] Google · Competitor',
        impressions: 9800,
        clicks: 210,
        cost: 510.0,
        conversions: 6,
        ctr: 2.14,
        note: 'Datos sintéticos — CPC alto / ROAS bajo (alerta esperada)',
      },
    ],
    demo: true,
    period: `${since} / ${until}`,
  };
}

/**
 * Analiza el rendimiento de ads de un período y guarda recomendaciones.
 * @param {string} since - YYYY-MM-DD
 * @param {string} until - YYYY-MM-DD
 * @param {string} [clientId]
 */
async function analyzePerformance(since, until, clientId = null) {
  const run = await AgentRun.start('performance', {
    inputData: { since, until, clientId },
  });

  try {
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

    let metaAds = metaData.status === 'fulfilled' ? metaData.value || [] : [];
    let googleAds = googleData.status === 'fulfilled' ? googleData.value || [] : [];
    let usedDemo = false;

    if (!metaAds.length && !googleAds.length) {
      const demo = demoMetrics(since, until);
      metaAds = demo.meta_ads;
      googleAds = demo.google_ads;
      usedDemo = true;
      logger.info({ msg: 'Performance usando métricas DEMO (sin APIs de ads)' });
    }

    const metricsPayload = {
      period: `${since} / ${until}`,
      meta_ads: metaAds,
      google_ads: googleAds,
      data_source: usedDemo ? 'demo' : 'live',
    };

    const { text, tokensUsed, provider } = await callLlm({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: JSON.stringify(metricsPayload, null, 2),
      maxTokens: 1500,
      context: `performance.${since}`,
    });

    const analysis = parseResponse(text, since, until, usedDemo);

    const saved = await savePerformanceReport({
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
      provider,
      demo: usedDemo,
      reportId: saved.id,
    });

    await run.complete({
      outputData: { ...analysis, report_id: saved.id },
      tokensUsed,
    });
    return { ...analysis, report_id: saved.id, report: saved };
  } catch (err) {
    await run.fail(err);
    throw err;
  }
}

function parseResponse(text, since, until, usedDemo) {
  const parsed = parseJsonLoose(text);
  if (!parsed || (!parsed.summary && !parsed.alerts && !parsed.raw_response)) {
    return {
      period: `${since} / ${until}`,
      summary: typeof text === 'string' ? text.slice(0, 500) : 'Sin análisis',
      alerts: [],
      recommendations: [],
      actions_pending_approval: [],
      data_source: usedDemo ? 'demo' : 'live',
      raw_response: text,
    };
  }
  return {
    period: parsed.period || `${since} / ${until}`,
    summary: parsed.summary || '',
    alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    actions_pending_approval: Array.isArray(parsed.actions_pending_approval)
      ? parsed.actions_pending_approval
      : [],
    data_source: usedDemo ? 'demo' : 'live',
  };
}

module.exports = { analyzePerformance };
