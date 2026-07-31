'use strict';

const express = require('express');
const router = express.Router();
const { generateProposal } = require('../agents/proposal');
const { getLead } = require('../db/leads');
const supabase = require('../db/client');
const logger = require('../lib/logger');

/**
 * GET /api/proposals — leads con propuesta IA (JSONB en leads)
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;
    let query = supabase
      .from('leads')
      .select('id, name, email, source, status, score, classification, proposal, proposal_status, diagnosis, updated_at, created_at')
      .not('proposal', 'is', null)
      .order('updated_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) query = query.eq('proposal_status', status);

    const { data, error } = await query;
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.json({ ok: true, proposals: data || [], count: (data || []).length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/proposals
 * Body: { lead_id, call_notes, budget_estimate }
 * Dispara el Agente Propuesta IA. La propuesta queda en "pending_approval".
 */
router.post('/', async (req, res) => {
  const { lead_id, call_notes, budget_estimate } = req.body;
  if (!lead_id) return res.status(400).json({ ok: false, error: 'lead_id requerido' });

  try {
    await getLead(lead_id);

    logger.info({ msg: 'Generando propuesta', leadId: lead_id });
    const proposal = await generateProposal(lead_id, { callNotes: call_notes, budgetEstimate: budget_estimate });
    return res.json({ ok: true, proposal, status: 'pending_approval' });
  } catch (err) {
    logger.error({ msg: 'Error generando propuesta', leadId: lead_id, error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/proposals/:lead_id
 */
router.get('/:lead_id', async (req, res) => {
  try {
    const lead = await getLead(req.params.lead_id);
    if (!lead.proposal) {
      return res.status(404).json({ ok: false, error: 'Este lead no tiene propuesta aún' });
    }
    return res.json({ ok: true, proposal: lead.proposal, status: lead.proposal_status });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/proposals/:lead_id/approve
 * Confirmación humana antes de enviar la propuesta al cliente.
 */
router.post('/:lead_id/approve', async (req, res) => {
  const supabase = require('../db/client');
  const leadId = req.params.lead_id;

  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .update({ proposal_status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .select('id, converted_deal_id, company_id, converted_contact_id')
    .single();

  if (leadErr) return res.status(500).json({ ok: false, error: leadErr.message });

  if (lead?.converted_deal_id) {
    try {
      const { updateDealStage } = require('../db/deals');
      await updateDealStage(lead.converted_deal_id, 'negociacion');
    } catch (err) {
      logger.warn({ msg: 'Deal stage post-approve soft-fail', error: err.message });
    }
  }

  try {
    const { createActivity } = require('../db/activities');
    await createActivity({
      type: 'note',
      title: 'Propuesta aprobada',
      lead_id: leadId,
      deal_id: lead?.converted_deal_id || null,
      contact_id: lead?.converted_contact_id || null,
      company_id: lead?.company_id || null,
      author_user_id: req.user?.id || null,
    });
  } catch (_) {
    /* soft */
  }

  logger.info({ msg: 'Propuesta aprobada', leadId });
  return res.json({ ok: true, message: 'Propuesta aprobada. Lista para enviar.' });
});

module.exports = router;
