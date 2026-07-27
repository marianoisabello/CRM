'use strict';

/**
 * Agente Performance / Ads (context.md: Agente 04)
 * Lee métricas multi-canal (Meta, Google, LinkedIn, TikTok, GA4, IG orgánico, WhatsApp)
 * o demo si no hay credenciales. Acciones irreversibles requieren aprobación humana.
 */

const fs = require('fs');
const path = require('path');
const { callLlm, parseJsonLoose } = require('../integrations/llm');
const { getCampaignInsights } = require('../integrations/meta');
const { getCampaignPerformance } = require('../integrations/googleAds');
const { getCampaignPerformance: getLinkedInAds } = require('../integrations/linkedinAds');
const { getCampaignPerformance: getTikTokAds } = require('../integrations/tiktokAds');
const { getOrganicMetrics } = require('../integrations/ga4');
const { getOrganicInsights } = require('../integrations/instagramOrganic');
const { getConversationMetrics } = require('../integrations/whatsappMetrics');
const { savePerformanceReport } = require('../db/campaigns');
const { CHANNELS, channelLabel, resolveChannels } = require('../lib/channels');
const AgentRun = require('../lib/agentRun');
const logger = require('../lib/logger');

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '../prompts/performance.txt'),
  'utf8'
);

function demoMetrics(since, until, channelIds) {
  const all = {
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
    linkedin_ads: [
      {
        campaign: '[DEMO] LinkedIn · Thought Leadership',
        impressions: 28500,
        clicks: 114,
        spend: 890.0,
        ctr: 0.4,
        leads: 4,
        cpl: 222.5,
        note: 'Datos sintéticos — conectar LINKEDIN_ADS_*',
      },
      {
        campaign: '[DEMO] LinkedIn · Lead Gen Form SaaS',
        impressions: 12400,
        clicks: 186,
        spend: 620.0,
        ctr: 1.5,
        leads: 11,
        cpl: 56.4,
        note: 'Datos sintéticos',
      },
    ],
    tiktok_ads: [
      {
        campaign: '[DEMO] TikTok · Spark Ads Prospecting',
        impressions: 195000,
        clicks: 6825,
        spend: 980.0,
        ctr: 3.5,
        conversions: 42,
        cpc: 0.14,
        note: 'Datos sintéticos — conectar TIKTOK_ADS_*',
      },
    ],
    ga4: [
      {
        source: 'organic',
        sessions: 12480,
        users: 9320,
        engaged_sessions: 6810,
        conversions: 86,
        bounce_rate: 0.41,
        avg_session_duration_sec: 142,
        note: 'Datos sintéticos GA4 — conectar GA4_*',
      },
      {
        source: 'direct',
        sessions: 4210,
        users: 3890,
        engaged_sessions: 2100,
        conversions: 28,
        bounce_rate: 0.52,
        avg_session_duration_sec: 98,
        note: 'Datos sintéticos',
      },
    ],
    instagram_organic: [
      {
        metric: 'reach',
        value: 48200,
        posts: 12,
        note: 'Datos sintéticos — conectar INSTAGRAM_*',
      },
      {
        metric: 'engagement',
        likes: 3120,
        comments: 248,
        saves: 610,
        shares: 94,
        engagement_rate: 8.4,
        note: 'Datos sintéticos',
      },
    ],
    whatsapp: [
      {
        conversations_started: 312,
        conversations_replied: 268,
        response_rate: 0.859,
        median_first_response_min: 4.2,
        open_conversations: 37,
        note: 'Datos sintéticos — conectar WHATSAPP_METRICS_*',
      },
    ],
  };

  const out = { demo: true, period: `${since} / ${until}` };
  for (const id of channelIds) {
    out[id] = all[id] || [];
  }
  return out;
}

const FETCHERS = {
  meta_ads: async (since, until) => {
    try {
      return await getCampaignInsights({ since, until });
    } catch (err) {
      logger.warn({ msg: 'Meta Ads no disponible', error: err.message });
      return [];
    }
  },
  google_ads: async (since, until) => {
    try {
      return await getCampaignPerformance(since, until);
    } catch (err) {
      logger.warn({ msg: 'Google Ads no disponible', error: err.message });
      return [];
    }
  },
  linkedin_ads: async (since, until) => {
    try {
      return await getLinkedInAds(since, until);
    } catch (err) {
      logger.warn({ msg: 'LinkedIn Ads no disponible', error: err.message });
      return [];
    }
  },
  tiktok_ads: async (since, until) => {
    try {
      return await getTikTokAds(since, until);
    } catch (err) {
      logger.warn({ msg: 'TikTok Ads no disponible', error: err.message });
      return [];
    }
  },
  ga4: async (since, until) => {
    try {
      return await getOrganicMetrics(since, until);
    } catch (err) {
      logger.warn({ msg: 'GA4 no disponible', error: err.message });
      return [];
    }
  },
  instagram_organic: async (since, until) => {
    try {
      return await getOrganicInsights(since, until);
    } catch (err) {
      logger.warn({ msg: 'Instagram orgánico no disponible', error: err.message });
      return [];
    }
  },
  whatsapp: async (since, until) => {
    try {
      return await getConversationMetrics(since, until);
    } catch (err) {
      logger.warn({ msg: 'WhatsApp metrics no disponible', error: err.message });
      return [];
    }
  },
};

function hasRows(value) {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Analiza el rendimiento multi-canal de un período y guarda recomendaciones.
 * @param {string} since - YYYY-MM-DD
 * @param {string} until - YYYY-MM-DD
 * @param {string} [clientId]
 * @param {string[]|string} [channelsInput] - ids de canal o "all"
 */
async function analyzePerformance(since, until, clientId = null, channelsInput = null) {
  const channels = resolveChannels(channelsInput);
  const run = await AgentRun.start('performance', {
    inputData: { since, until, clientId, channels },
  });

  try {
    const settled = await Promise.all(
      channels.map(async (id) => {
        const fetcher = FETCHERS[id];
        const data = fetcher ? await fetcher(since, until) : [];
        return { id, data: Array.isArray(data) ? data : [] };
      })
    );

    const metricsByChannel = {};
    const channelSources = {};
    for (const { id, data } of settled) {
      metricsByChannel[id] = data;
    }

    const demo = demoMetrics(since, until, channels);
    let usedDemo = false;
    let anyLive = false;

    for (const id of channels) {
      if (hasRows(metricsByChannel[id])) {
        channelSources[id] = 'live';
        anyLive = true;
      } else {
        metricsByChannel[id] = demo[id] || [];
        channelSources[id] = 'demo';
        usedDemo = true;
      }
    }

    const dataSource = anyLive && usedDemo ? 'mixed' : usedDemo ? 'demo' : 'live';
    if (usedDemo) {
      logger.info({ msg: 'Performance multi-canal con DEMO parcial/total', dataSource, channelSources });
    }

    const metricsPayload = {
      period: `${since} / ${until}`,
      channels_analyzed: channels.map((id) => ({ id, label: channelLabel(id), source: channelSources[id] })),
      metrics: metricsByChannel,
      channel_sources: channelSources,
      // compat con prompts/seeds previos
      meta_ads: metricsByChannel.meta_ads || [],
      google_ads: metricsByChannel.google_ads || [],
      data_source: dataSource,
    };

    const { text, tokensUsed, provider } = await callLlm({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: JSON.stringify(metricsPayload, null, 2),
      maxTokens: 2000,
      context: `performance.${since}`,
    });

    const analysis = parseResponse(text, since, until, dataSource, channels, metricsByChannel, channelSources);

    const saved = await savePerformanceReport({
      period_since: since,
      period_until: until,
      client_id: clientId,
      channels,
      analysis,
      actions_pending_approval: analysis.actions_pending_approval || [],
    });

    logger.info({
      msg: 'Performance analizado',
      period: `${since}/${until}`,
      channels,
      alerts: analysis.alerts?.length,
      pendingActions: analysis.actions_pending_approval?.length,
      provider,
      dataSource,
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

function buildChannelBreakdown(channels, metricsByChannel) {
  return channels.map((id) => {
    const rows = metricsByChannel[id] || [];
    const meta = CHANNELS[id];
    return {
      channel: id,
      label: meta?.label || id,
      kind: meta?.kind || 'other',
      rows: rows.length,
      sample: rows.slice(0, 3),
    };
  });
}

function parseResponse(text, since, until, dataSource, channels, metricsByChannel, channelSources) {
  const parsed = parseJsonLoose(text);
  const breakdown = buildChannelBreakdown(channels, metricsByChannel);
  const snapshot = {};
  for (const id of channels) {
    snapshot[id] = metricsByChannel[id] || [];
  }

  if (!parsed || (!parsed.summary && !parsed.alerts && !parsed.raw_response)) {
    return {
      period: `${since} / ${until}`,
      summary: typeof text === 'string' ? text.slice(0, 500) : 'Sin análisis',
      alerts: [],
      recommendations: [],
      actions_pending_approval: [],
      channels_analyzed: channels,
      channel_breakdown: breakdown,
      metrics_snapshot: snapshot,
      channel_sources: channelSources || {},
      data_source: dataSource,
      raw_response: text,
    };
  }

  const alerts = Array.isArray(parsed.alerts)
    ? parsed.alerts.map((a) => ({
        channel: a.channel || null,
        campaign: a.campaign || a.metric || '',
        issue: a.issue || '',
        severity: a.severity || 'media',
      }))
    : [];

  return {
    period: parsed.period || `${since} / ${until}`,
    summary: parsed.summary || '',
    alerts,
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    actions_pending_approval: Array.isArray(parsed.actions_pending_approval)
      ? parsed.actions_pending_approval
      : [],
    channels_analyzed: Array.isArray(parsed.channels_analyzed)
      ? parsed.channels_analyzed
      : channels,
    channel_breakdown: Array.isArray(parsed.channel_breakdown) && parsed.channel_breakdown.length
      ? parsed.channel_breakdown
      : breakdown,
    metrics_snapshot: parsed.metrics_snapshot && typeof parsed.metrics_snapshot === 'object'
      ? parsed.metrics_snapshot
      : snapshot,
    channel_sources: channelSources || {},
    data_source: dataSource,
  };
}

module.exports = { analyzePerformance, resolveChannels };
