'use strict';

/**
 * Agente Reporting mensual (context.md: Agente 05)
 * Genera reporte ejecutivo por cliente. Requiere confirmación humana antes de enviar.
 */

const fs = require('fs');
const path = require('path');
const { callLlm, parseJsonLoose } = require('../integrations/llm');
const { getMonthlyMetrics, saveMonthlyReport } = require('../db/campaigns');
const { getClient } = require('../db/clients');
const AgentRun = require('../lib/agentRun');
const logger = require('../lib/logger');

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '../prompts/reporting.txt'),
  'utf8'
);

/**
 * Genera el reporte mensual para un cliente.
 * @param {string} clientId
 * @param {string} month - YYYY-MM
 * @param {string} [teamNotes]
 */
async function generateMonthlyReport(clientId, month, teamNotes = '') {
  const run = await AgentRun.start('reporting', { inputData: { clientId, month } });

  try {
    if (!/^\d{4}-\d{2}$/.test(String(month || ''))) {
      throw new Error('month debe ser YYYY-MM');
    }

    const client = await getClient(clientId);
    const [year, monthNum] = month.split('-').map(Number);
    const since = `${month}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const until = `${month}-${String(lastDay).padStart(2, '0')}`;

    const prevDate = new Date(year, monthNum - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevLastDay = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate();

    const [currentMetrics, prevMetrics] = await Promise.all([
      getMonthlyMetrics(clientId, since, until),
      getMonthlyMetrics(clientId, `${prevMonth}-01`, `${prevMonth}-${String(prevLastDay).padStart(2, '0')}`),
    ]);

    const { text, tokensUsed, provider } = await callLlm({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: JSON.stringify({
        client: {
          id: client.id,
          company: client.company,
          monthly_budget: client.monthly_budget,
          services: client.services,
          status: client.status,
        },
        month,
        current_metrics: currentMetrics,
        previous_month_metrics: prevMetrics,
        team_notes: teamNotes || '[Sin notas del equipo]',
      }, null, 2),
      maxTokens: 2000,
      context: `reporting.${clientId}.${month}`,
    });

    const report = parseResponse(text, month);

    const saved = await saveMonthlyReport({
      client_id: clientId,
      month,
      report,
      status: 'pending_approval',
    });

    logger.info({
      msg: 'Reporte mensual generado (pendiente aprobación)',
      clientId,
      month,
      provider,
      reportId: saved.id,
    });

    await run.complete({
      outputData: { ...report, report_id: saved.id },
      tokensUsed,
    });
    return { ...report, report_id: saved.id, saved };
  } catch (err) {
    await run.fail(err);
    throw err;
  }
}

function parseResponse(text, month) {
  const parsed = parseJsonLoose(text);
  if (!parsed || (!parsed.headline && !parsed.key_metrics)) {
    return {
      period: month,
      headline: typeof text === 'string' ? text.slice(0, 200) : 'Reporte generado',
      key_metrics: [],
      wins: [],
      explanations: [],
      next_month_plan: [],
      report_ready_to_send: false,
      raw_response: text,
    };
  }
  return {
    period: parsed.period || month,
    headline: parsed.headline || '',
    key_metrics: Array.isArray(parsed.key_metrics) ? parsed.key_metrics : [],
    wins: Array.isArray(parsed.wins) ? parsed.wins : [],
    explanations: Array.isArray(parsed.explanations) ? parsed.explanations : [],
    next_month_plan: Array.isArray(parsed.next_month_plan) ? parsed.next_month_plan : [],
    report_ready_to_send: Boolean(parsed.report_ready_to_send),
  };
}

module.exports = { generateMonthlyReport };
