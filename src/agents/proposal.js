'use strict';

/**
 * Agente 03 — Asistente de Propuesta
 * Lee diagnóstico + notas de call, genera propuesta comercial.
 * Requiere confirmación humana antes de enviar.
 */

const fs = require('fs');
const path = require('path');
const { callLlm, parseJsonLoose } = require('../integrations/llm');
const { getLead, updateLeadProposal } = require('../db/leads');
const supabase = require('../db/client');
const AgentRun = require('../lib/agentRun');
const logger = require('../lib/logger');

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '../prompts/proposal.txt'),
  'utf8'
);

/**
 * Genera una propuesta comercial para un lead.
 * Preferencia: diagnosis JSONB → perfil + última reunión (fallback post Agente 02/03).
 */
async function generateProposal(leadId, { callNotes = '', budgetEstimate = null } = {}) {
  const run = await AgentRun.start('proposal', { leadId, inputData: { budgetEstimate } });

  try {
    const lead = await getLead(leadId);
    let perfil = null;
    let reunion = null;

    if (lead.email) {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from('perfiles').select('*').eq('email', lead.email.toLowerCase()).maybeSingle(),
        supabase
          .from('reuniones')
          .select('id, titulo, resumen, pain_points, objeciones, nivel_interes, proximos_pasos, score_cierre, status')
          .eq('lead_email', lead.email.toLowerCase())
          .eq('status', 'done')
          .order('updated_at', { ascending: false })
          .limit(1),
      ]);
      perfil = p;
      reunion = (r && r[0]) || null;
    }

    if (!lead.diagnosis && !perfil && !reunion && !callNotes) {
      throw new Error(
        'Falta contexto: generá un perfil (Analista), una reunión (Reuniones) o pegá notas de call.'
      );
    }

    const userMessage = JSON.stringify({
      lead_profile: {
        name: lead.name,
        email: lead.email,
        source: lead.source,
        classification: lead.classification,
        empresa: lead.empresa || perfil?.empresa,
      },
      diagnosis: lead.diagnosis || null,
      perfil: perfil
        ? {
            pain_points_inferidos: perfil.pain_points_inferidos,
            servicios_recomendados: perfil.servicios_recomendados,
            oferta_estimada: perfil.oferta_estimada,
            score_potencial: perfil.score_potencial,
          }
        : null,
      ultima_reunion: reunion || null,
      call_notes: callNotes,
      budget_estimate_usd: budgetEstimate,
    }, null, 2);

    const { text, tokensUsed } = await callLlm({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      maxTokens: 1500,
      context: `proposal.lead.${leadId}`,
    });

    const proposal = parseResponse(text);

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
  const parsed = parseJsonLoose(text);
  if (!parsed || Object.keys(parsed).length === 0) {
    return { raw_response: text, proposal_ready: false };
  }
  return parsed;
}

module.exports = { generateProposal };
