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
  const lead = await getLead(leadId);
  const dealId = lead.converted_deal_id || null;
  const run = await AgentRun.start('proposal', {
    leadId,
    dealId,
    inputData: { budgetEstimate, deal_id: dealId },
  });

  try {
    let perfil = null;
    let reunion = null;
    let deal = null;

    const tasks = [];
    if (lead.email) {
      tasks.push(
        supabase.from('perfiles').select('*').eq('email', lead.email.toLowerCase()).maybeSingle(),
        supabase
          .from('reuniones')
          .select('id, titulo, resumen, pain_points, objeciones, nivel_interes, proximos_pasos, score_cierre, status')
          .eq('lead_email', lead.email.toLowerCase())
          .eq('status', 'done')
          .order('updated_at', { ascending: false })
          .limit(1)
      );
    }
    if (dealId) {
      tasks.push(supabase.from('deals').select('id, title, stage, status, value, currency').eq('id', dealId).maybeSingle());
    }

    const results = await Promise.all(tasks);
    let idx = 0;
    if (lead.email) {
      perfil = results[idx++]?.data || null;
      const r = results[idx++]?.data;
      reunion = (r && r[0]) || null;
    }
    if (dealId) deal = results[idx++]?.data || null;

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
        empresa: lead.company_name || lead.empresa || perfil?.empresa,
        company_id: lead.company_id || null,
      },
      deal: deal || null,
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

    if (dealId) {
      try {
        await supabase
          .from('lead_propuestas')
          .update({ deal_id: dealId, updated_at: new Date().toISOString() })
          .eq('lead_id', leadId);
      } catch (_) {
        /* soft */
      }

      try {
        const { updateDealStage } = require('../db/deals');
        if (deal?.stage === 'prospeccion') await updateDealStage(dealId, 'propuesta');
      } catch (err) {
        logger.warn({ msg: 'No se pudo avanzar deal a propuesta', dealId, error: err.message });
      }
    }

    try {
      const { createDecision } = require('../db/agentDecisions');
      const { createActivity } = require('../db/activities');
      await createDecision({
        agent_id: 'proposal',
        decision_type: 'proposal_draft',
        title: `Propuesta pendiente — ${lead.name || lead.email || leadId}`,
        summary: proposal?.executive_summary || proposal?.titulo || null,
        payload: { lead_id: leadId, proposal },
        lead_id: leadId,
        deal_id: dealId,
        contact_id: lead.converted_contact_id || null,
        company_id: lead.company_id || null,
        agent_run_id: run.id,
      });
      await createActivity({
        type: 'agent',
        title: 'Propuesta generada (pendiente aprobación)',
        lead_id: leadId,
        deal_id: dealId,
        contact_id: lead.converted_contact_id || null,
        company_id: lead.company_id || null,
        agent_id: 'proposal',
        agent_run_id: run.id,
      });
    } catch (err) {
      logger.warn({ msg: 'Decision/activity proposal soft-fail', error: err.message });
    }

    await run.complete({ outputData: proposal, tokensUsed });
    logger.info({ msg: 'Propuesta generada (pendiente aprobación)', leadId, dealId });
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
