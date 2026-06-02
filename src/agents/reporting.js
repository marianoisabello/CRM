'use strict';

/**
 * Agente 05 — Reporting mensual
 * Genera el reporte ejecutivo mensual por cliente.
 * Requiere confirmación humana antes de distribuir.
 */

const fs = require('fs');
const path = require('path');
const { callClaude } = require('../integrations/ai');
const { getMonthlyMetrics, saveMonthlyReport } = require('../db/campaigns');
const AgentRun = require('../lib/agentRun');
const logger = require('../lib/logger');

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '../prompts/reporting.txt'),
  'utf8'
);

/**
 * Genera el reporte mensual para un cliente.
 * @param {string} clientId
 * @param {string} month - YYYY-MM (ej: "2026-06")
 * @param {string} [teamNotes] - notas del equipo sobre el período
 */
async function generateMonthlyReport(clientId, month, teamNotes = '') {
  const run = await AgentRun.start('reporting', { inputData: { clientId, month } });

  try {
    const [year, monthNum] = month.split('-').map(Number);
    const since = `${month}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const until = `${month}-${String(lastDay).padStart(2, '0')}`;

    // Mes anterior para comparación
    const prevDate = new Date(year, monthNum - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const [currentMetrics, prevMetrics] = await Promise.all([
      getMonthlyMetrics(clientId, since, until),
      getMonthlyMetrics(
        clientId,
        `${prevMonth}-01`,
        `${prevMonth}-${new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate()}`
      ),
    ]);

    const { text, tokensUsed } = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: JSON.stringify({
        client_id: clientId,
        month,
        current_metrics: currentMetrics,
        previous_month_metrics: prevMetrics,
        team_notes: teamNotes,
      }, null, 2),
      maxTokens: 2000,
      context: `reporting.${clientId}.${month}`,
    });

    const report = parseResponse(text);

    // Guardar con estado "pending_approval" — no se distribuye hasta que lo apruebe un humano
    await saveMonthlyReport({
      client_id: clientId,
      month,
      report,
      status: 'pending_approval',
    });

    logger.info({ msg: 'Reporte mensual generado (pendiente aprobación)', clientId, month });

    await run.complete({ outputData: report, tokensUsed });
    return report;
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
    return { raw_response: text, report_ready_to_send: false };
  }
}

module.exports = { generateMonthlyReport };
