'use strict';

/**
 * Agente 02 — Analista / Diagnóstico
 * Corre FUERA del CRM al inicio (Claude Projects / llamada manual),
 * pero este módulo sirve como wrapper para llamarlo internamente si se desea.
 *
 * Entrada: lead_id con notas de la reunión inicial.
 * Salida:  diagnóstico guardado en la tabla `diagnoses` del lead.
 */

const fs = require('fs');
const path = require('path');
const { callClaude } = require('../integrations/ai');
const { getLead, updateLeadDiagnosis } = require('../db/leads');
const AgentRun = require('../lib/agentRun');
const logger = require('../lib/logger');

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '../prompts/analyst.txt'),
  'utf8'
);

/**
 * Genera el diagnóstico de un lead calificado.
 * @param {string} leadId
 * @param {string} meetingNotes - notas de la reunión de discovery
 */
async function generateDiagnosis(leadId, meetingNotes) {
  const run = await AgentRun.start('analyst', { leadId, inputData: { meetingNotes } });

  try {
    const lead = await getLead(leadId);

    const userMessage = JSON.stringify({
      lead_profile: {
        name: lead.name,
        source: lead.source,
        message: lead.message,
        classification: lead.classification,
        score: lead.score,
      },
      meeting_notes: meetingNotes,
    }, null, 2);

    const { text, tokensUsed } = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      maxTokens: 1024,
      context: `analyst.lead.${leadId}`,
    });

    const diagnosis = parseResponse(text);

    await updateLeadDiagnosis(leadId, {
      diagnosis,
      status: 'qualified',
    });

    await run.complete({ outputData: diagnosis, tokensUsed });
    logger.info({ msg: 'Diagnóstico generado', leadId, fit: diagnosis?.dana_fit });
    return diagnosis;
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
    return { raw_response: text, diagnosis_complete: false };
  }
}

module.exports = { generateDiagnosis };
