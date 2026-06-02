'use strict';

const express = require('express');
const router = express.Router();
const supabase = require('../db/client');

// GET /api/leads?classification=hot&status=new&limit=50&offset=0
router.get('/', async (req, res) => {
  const { classification, status, source, limit = 50, offset = 0 } = req.query;

  let query = supabase
    .from('leads')
    .select('id, name, email, contact, contact_type, source, status, score, classification, next_action, sdr_notes, created_at')
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (classification) query = query.eq('classification', classification);
  if (status) query = query.eq('status', status);
  if (source) query = query.eq('source', source);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ ok: false, error: error.message });

  return res.json({ ok: true, leads: data, total: count });
});

// GET /api/leads/stats
router.get('/stats', async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .select('classification, status, source');

  if (error) return res.status(500).json({ ok: false, error: error.message });

  const stats = {
    total: data.length,
    by_classification: { hot: 0, warm: 0, cold: 0, unqualified: 0, pending: 0 },
    by_status: { new: 0, contacted: 0, qualified: 0, lost: 0, won: 0 },
    by_source: {},
  };

  for (const lead of data) {
    if (lead.classification) stats.by_classification[lead.classification] = (stats.by_classification[lead.classification] || 0) + 1;
    else stats.by_classification.pending++;
    if (lead.status) stats.by_status[lead.status] = (stats.by_status[lead.status] || 0) + 1;
    if (lead.source) stats.by_source[lead.source] = (stats.by_source[lead.source] || 0) + 1;
  }

  return res.json({ ok: true, stats });
});

// PATCH /api/leads/:id/status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const valid = ['new', 'contacted', 'qualified', 'lost', 'won'];
  if (!valid.includes(status)) return res.status(400).json({ ok: false, error: 'Status inválido' });

  const { data, error } = await supabase
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true, lead: data });
});

module.exports = router;
