'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/agentDecisions');
const supabase = require('../db/client');
const logger = require('../lib/logger');

async function executeDecision(decision) {
  const type = decision.decision_type;
  const payload = decision.payload || {};

  if (type === 'proposal_draft' && (payload.lead_id || decision.lead_id)) {
    const leadId = payload.lead_id || decision.lead_id;
    await supabase
      .from('leads')
      .update({ proposal_status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', leadId);
    if (decision.deal_id) {
      try {
        const { updateDealStage } = require('../db/deals');
        await updateDealStage(decision.deal_id, 'negociacion');
      } catch (err) {
        logger.warn({ msg: 'executeDecision deal stage soft-fail', error: err.message });
      }
    }
    return { executed: 'proposal_approved', lead_id: leadId };
  }

  if (type === 'briefing_draft' && (payload.briefing_id || decision.payload?.briefing_id)) {
    const briefingId = payload.briefing_id;
    if (briefingId) {
      await supabase
        .from('briefings')
        .update({ status: 'REVISADO', updated_at: new Date().toISOString() })
        .eq('id', briefingId);
      return { executed: 'briefing_revisado', briefing_id: briefingId };
    }
  }

  return { executed: null };
}

router.get('/', async (req, res) => {
  try {
    const decisions = await db.listDecisions(req.query);
    return res.json({ ok: true, decisions });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const decision = await db.getDecision(req.params.id);
    return res.json({ ok: true, decision });
  } catch (err) {
    return res.status(404).json({ ok: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const decision = await db.createDecision(req.body || {});
    return res.status(201).json({ ok: true, decision });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
    let decision = await db.decide(req.params.id, {
      status: 'approved',
      decided_by: req.user?.id || null,
    });
    const result = await executeDecision(decision);
    if (result.executed) {
      decision = await db.decide(req.params.id, {
        status: 'executed',
        decided_by: req.user?.id || null,
      });
    }
    return res.json({ ok: true, decision, execution: result });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const decision = await db.decide(req.params.id, {
      status: 'rejected',
      decided_by: req.user?.id || null,
    });
    return res.json({ ok: true, decision });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = router;
