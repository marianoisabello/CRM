'use strict';

/**
 * Agente 01 — SDR / Agendamiento
 * Corre DENTRO del CRM. Se dispara automáticamente en cada ingesta de lead.
 *
 * Flujo:
 *   1. Score determinístico (leadScore.js)
 *   2. Llamada a IA para análisis cualitativo y mensaje de primer contacto
 *   3. Actualiza el Lead con score, classification, next_action
 *   4. Si es "hot" y hay calendario configurado: genera link de agendamiento
 */

const fs = require('fs');
const path = require('path');
const { scoreLeadData } = require('../scoring/leadScore');
const { callClaude } = require('../integrations/ai');
const { getSchedulingLink } = require('../integrations/calendar');
const { updateLeadScoring } = require('../db/leads');
const AgentRun = require('../lib/agentRun');
const logger = require('../lib/logger');

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '../prompts/sdr.txt'),
  'utf8'
);

/**
 * Procesa un lead recién ingresado.
 * @param {Object} lead - Lead normalizado de la DB
 * @returns {Object} resultado del SDR
 */
async function processLead(lead) {
  const run = await AgentRun.start('sdr', { leadId: lead.id, inputData: { source: lead.source } });

  try {
    // Paso 1: score determinístico
    const { score, classification, next_action, reasons } = scoreLeadData(lead);

    logger.info({
      msg: 'SDR score calculado',
      leadId: lead.id,
      score,
      classification,
      next_action,
      reasons,
    });

    // Paso 2: análisis IA (si hay API key configurada)
    let aiResult = null;
    let tokensUsed = 0;

    if (process.env.ANTHROPIC_API_KEY) {
      const userMessage = buildUserMessage(lead, score, classification, reasons);
      const { text, tokensUsed: tokens } = await callClaude({
        systemPrompt: SYSTEM_PROMPT,
        userMessage,
        maxTokens: 512,
        context: `sdr.lead.${lead.id}`,
      });

      tokensUsed = tokens;
      aiResult = parseAIResponse(text);
    }

    // Paso 3: combinar score determinístico con resultado IA
    const finalClassification = aiResult?.classification || classification;
    const finalNextAction = aiResult?.next_action || next_action;

    // Paso 4: link de agendamiento si es hot
    let schedulingLink = null;
    if (finalNextAction === 'schedule_meeting') {
      schedulingLink = await getSchedulingLink(lead).catch((err) => {
        logger.warn({ msg: 'No se pudo generar link de agendamiento', error: err.message });
        return null;
      });
    }

    // Paso 5: actualizar Lead en DB
    await updateLeadScoring(lead.id, {
      score,
      classification: finalClassification,
      next_action: finalNextAction,
      status: finalNextAction === 'discard' ? 'lost' : 'new',
      sdr_notes: aiResult
        ? `${aiResult.reasoning}\n\nPrimer mensaje sugerido: ${aiResult.first_message}`
        : reasons.join(', '),
    });

    const output = {
      score,
      classification: finalClassification,
      next_action: finalNextAction,
      scheduling_link: schedulingLink,
      first_message: aiResult?.first_message || null,
      follow_up_days: aiResult?.follow_up_days || null,
    };

    await run.complete({ outputData: output, tokensUsed });
    return output;
  } catch (err) {
    await run.fail(err);
    logger.error({ msg: 'Error en SDR agent', leadId: lead.id, error: err.message });
    throw err;
  }
}

function buildUserMessage(lead, score, classification, reasons) {
  return JSON.stringify({
    lead: {
      source: lead.source,
      name: lead.name,
      email: lead.email,
      contact_type: lead.contact_type,
      message: lead.message,
    },
    deterministic_score: score,
    deterministic_classification: classification,
    score_reasons: reasons,
  }, null, 2);
}

function parseAIResponse(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    logger.warn({ msg: 'SDR: no se pudo parsear respuesta IA', text: text.substring(0, 200) });
    return null;
  }
}

module.exports = { processLead };
