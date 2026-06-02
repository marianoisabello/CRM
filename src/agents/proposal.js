'use strict';

/**
 * Agente 03 — Asistente de Propuesta
 * Lee diagnóstico + notas de call, genera propuesta comercial.
 * Requiere confirmación humana antes de enviar.
 */

const fs = require('fs');
const path = require('path');
const { callClaude } = require('../integrations/ai');
const { getLead, updateLeadProposal } = require('../db/leads');
const AgentRun = require('../lib/agentRun');
const logger = require('../lib/logger');

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '../prompts/proposal.txt'),
  'utf8'
);

/**
 * Genera una propuesta comercial para un lead con diagnóstico completo.
 * @param {string} leadId
 * @param {Object} options
 * @param {string} [options.callNotes] - notas adicionales de la call de discovery
 * @param {number} [options.budgetEstimate] - presupuesto estimado del cliente en USD
 */
async function generateProposal(leadId, { callNotes = '', budgetEstimate = null } = {}) {
  const run = await AgentRun.start('proposal', { leadId, inputData: { budgetEstimate } });

  try {
    const lead = await getLead(leadId);

    if (!lead.diagnosis) {
      throw new Error('El lead no tiene diagnóstico. Ejecutar el Agente 02 primero.');
    }

    const userMessage = JSON.stringify({
      lead_profile: {
        name: lead.name,
        source: lead.source,
        classification: lead.classification,
      },
      diagnosis: lead.diagnosis,
      call_notes: callNotes,
      budget_estimate_usd: budgetEstimate,
    }, null, 2);

    const { text, tokensUsed } = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      maxTokens: 1500,
      context: `proposal.lead.${leadId}`,
    });

    const proposal = parseResponse(text);

    // Guardar propuesta con estado "pending_approval" — requiere ok humano antes de enviar
    await updateLeadProposal(leadId, {
      proposal,
      proposal_status: 'pending_approval',
    });

    await run.complete({ outputData: proposal, tokensUsed });
    logger.info({ msg: 'Propuesta generada (pendiente aprobación)', leadId });
    return proposal;
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
    return { raw_response: text, proposal_ready: false };
  }
}

module.exports = { generateProposal };
