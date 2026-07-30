'use strict';

const express = require('express');
const router = express.Router();
const supabase = require('../db/client');

// GET /api/leads?classification=hot&status=new&source=manychat&q=nombre|email&limit=50&offset=0
router.get('/', async (req, res) => {
  const { classification, status, source, q, limit = 50, offset = 0 } = req.query;

  let query = supabase
    .from('leads')
    .select('id, name, email, contact, contact_type, source, status, score, classification, next_action, sdr_notes, message, created_at')
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (classification) query = query.eq('classification', classification);
  if (status) query = query.eq('status', status);
  if (source) query = query.eq('source', source);
  if (q) {
    const safe = String(q).trim().replace(/[%*,()"\\]/g, '').slice(0, 80);
    if (safe) {
      const term = `"%${safe}%"`;
      query = query.or(`name.ilike.${term},email.ilike.${term}`);
    }
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ ok: false, error: error.message });

  return res.json({ ok: true, leads: data });
});

// GET /api/leads/stats
router.get('/stats', async (req, res) => {
  const [allLeads, recentLeads, perfilesC, reunionesC, briefingsC, perfC, monthlyC, clientsC] = await Promise.all([
    supabase.from('leads').select('classification, status, source, score'),
    supabase
      .from('leads')
      .select('id, name, email, source, status, score, classification, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('perfiles').select('email', { count: 'exact', head: true }),
    supabase.from('reuniones').select('id', { count: 'exact', head: true }),
    supabase.from('briefings').select('id', { count: 'exact', head: true }),
    supabase.from('performance_reports').select('id', { count: 'exact', head: true }),
    supabase.from('monthly_reports').select('id', { count: 'exact', head: true }),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  if (allLeads.error) return res.status(500).json({ ok: false, error: allLeads.error.message });

  const data = allLeads.data;
  const stats = {
    total: data.length,
    by_classification: { hot: 0, warm: 0, cold: 0, unqualified: 0, pending: 0 },
    by_status: { new: 0, contacted: 0, qualified: 0, lost: 0, won: 0 },
    by_source: {},
    avg_score: 0,
    recent_leads: recentLeads.data || [],
    agents: {
      perfiles: perfilesC.count || 0,
      reuniones: reunionesC.count || 0,
      briefings: briefingsC.count || 0,
      performance_reports: perfC.count || 0,
      monthly_reports: monthlyC.count || 0,
      clients_active: clientsC.count || 0,
    },
  };

  let scoreSum = 0, scoreCount = 0;
  for (const lead of data) {
    if (lead.classification) stats.by_classification[lead.classification] = (stats.by_classification[lead.classification] || 0) + 1;
    else stats.by_classification.pending++;
    if (lead.status) stats.by_status[lead.status] = (stats.by_status[lead.status] || 0) + 1;
    if (lead.source) stats.by_source[lead.source] = (stats.by_source[lead.source] || 0) + 1;
    if (lead.score) { scoreSum += lead.score; scoreCount++; }
  }
  stats.avg_score = scoreCount ? Math.round(scoreSum / scoreCount) : 0;

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

  // Wiring ligero: al pasar a qualified, encolar briefing en background (si hay email)
  if (status === 'qualified' && data?.email) {
    const logger = require('../lib/logger');
    setImmediate(() => {
      const { generateBriefing } = require('../agents/briefing');
      generateBriefing({ email: data.email, leadId: data.id, force: false })
        .then((r) => logger.info({ msg: 'Briefing auto tras qualified', id: r?.briefing?.id, email: data.email }))
        .catch((err) => logger.warn({ msg: 'Briefing auto skipped/failed', email: data.email, error: err.message }));
    });
  }

  return res.json({ ok: true, lead: data });
});

module.exports = router;
