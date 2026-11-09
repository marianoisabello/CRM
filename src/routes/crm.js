'use strict';

/**
 * /api/crm — endpoints de SOLO LECTURA (más tasks/settings) para la capa de
 * presentación nueva: dashboard, contactos ganados, empresas agrupadas,
 * agenda de tareas, analytics. No renombra ni reemplaza endpoints existentes.
 */

const express = require('express');
const router = express.Router();
const supabase = require('../db/client');
const logger = require('../lib/logger');
const { listStages } = require('../db/pipelineStages');

// ─── helpers ──────────────────────────────────────────────────────────────────

const MISSING_TABLE = /schema cache|does not exist|PGRST205/i;

function isMissingTable(err) {
  return Boolean(err && MISSING_TABLE.test(err.message || ''));
}

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfPrevMonth(d) { return new Date(d.getFullYear(), d.getMonth() - 1, 1); }
function startOfQuarter(d) { return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1); }
function endOfQuarter(d) { return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 0, 23, 59, 59); }
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function inRange(ts, from, to) {
  if (!ts) return false;
  const t = new Date(ts).getTime();
  return t >= from.getTime() && t < to.getTime();
}
function sum(rows, f) { return rows.reduce((s, r) => s + (Number(f(r)) || 0), 0); }
function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }

async function safeSelect(table, build) {
  try {
    let q = supabase.from(table);
    q = build(q);
    const { data, error, count } = await q;
    if (error) {
      if (isMissingTable(error)) return { data: [], missing: true, count: 0 };
      throw new Error(error.message);
    }
    return { data: data || [], missing: false, count: count ?? null };
  } catch (err) {
    if (isMissingTable(err)) return { data: [], missing: true };
    throw err;
  }
}

async function usersMap() {
  const { data } = await supabase.from('users').select('id, name, email');
  const map = {};
  for (const u of data || []) map[u.id] = { id: u.id, name: u.name || u.email, email: u.email };
  return map;
}

// ─── GET /api/crm/users ───────────────────────────────────────────────────────
router.get('/users', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('id, name, email, role').order('name');
    if (error) throw new Error(error.message);
    return res.json({ ok: true, users: data || [] });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── settings (crm_settings) ──────────────────────────────────────────────────
router.get('/settings/:key', async (req, res) => {
  try {
    const { data, missing } = await safeSelect('crm_settings', (q) =>
      q.select('key, value, updated_at').eq('key', req.params.key).limit(1)
    );
    if (missing) return res.json({ ok: true, setting: null, missing_table: 'crm_settings' });
    return res.json({ ok: true, setting: data[0] || null });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/settings/:key', async (req, res) => {
  try {
    if (!/^[a-z0-9_]{1,64}$/i.test(req.params.key)) return res.status(400).json({ ok: false, error: 'key inválida' });
    const value = req.body?.value;
    if (value === undefined) return res.status(400).json({ ok: false, error: 'value requerido' });
    const { data, error } = await supabase
      .from('crm_settings')
      .upsert(
        { key: req.params.key, value, updated_by: req.user?.id || null, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
      .select()
      .single();
    if (error) {
      if (isMissingTable(error)) {
        return res.status(409).json({
          ok: false,
          error: 'Falta la tabla crm_settings. Ejecutá scripts/migrations/008_crm_settings.sql en Supabase.',
          missing_table: 'crm_settings',
        });
      }
      throw new Error(error.message);
    }
    return res.json({ ok: true, setting: data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /api/crm/dashboard ───────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const mStart = startOfMonth(now);
    const pStart = startOfPrevMonth(now);
    const qStart = startOfQuarter(now);
    const qEnd = endOfQuarter(now);
    const dStart = startOfDay(now);
    const yStart = new Date(dStart.getTime() - 86400000);
    const since60 = new Date(now.getTime() - 60 * 86400000).toISOString();
    const qNum = Math.floor(now.getMonth() / 3) + 1;
    const targetKey = `quarter_target_${now.getFullYear()}_Q${qNum}`;

    const [stages, dealsR, actsR, leadsR, settingR, users, decR, meetR] = await Promise.all([
      listStages({ activeOnly: true }),
      safeSelect('deals', (q) =>
        q.select('id, title, value, currency, stage, status, probability, stage_entered_at, won_at, lost_at, created_at, updated_at, expected_close, contact_id, company_id, lead_id, owner_id, source, contacts(id, name, email, phone, role), companies(id, name)')
          .order('updated_at', { ascending: false })
          .limit(400)
      ),
      safeSelect('activities', (q) => q.select('id, type, occurred_at, author_user_id, agent_id, deal_id').gte('occurred_at', since60)),
      supabase.from('leads').select('id, name, status, classification, score, source, created_at, updated_at, next_action').limit(2000),
      safeSelect('crm_settings', (q) => q.select('key, value').eq('key', targetKey).limit(1)),
      usersMap(),
      safeSelect('agent_decisions', (q) => q.select('id', { count: 'exact', head: true }).eq('status', 'pending')),
      safeSelect('meetings', (q) => q.select('id, scheduled_at, status').gte('scheduled_at', dStart.toISOString()).eq('status', 'scheduled').order('scheduled_at').limit(5)),
    ]);

    if (leadsR.error) throw new Error(leadsR.error.message);
    const leads = leadsR.data || [];
    const deals = dealsR.data;
    const acts = actsR.data;

    const open = deals.filter((d) => d.status === 'open');
    const won = deals.filter((d) => d.status === 'won');
    const lost = deals.filter((d) => d.status === 'lost');

    const wonMonth = won.filter((d) => inRange(d.won_at, mStart, now));
    const wonPrev = won.filter((d) => inRange(d.won_at, pStart, mStart));
    const lostMonth = lost.filter((d) => inRange(d.lost_at, mStart, now));
    const lostPrev = lost.filter((d) => inRange(d.lost_at, pStart, mStart));
    const createdMonth = deals.filter((d) => inRange(d.created_at, mStart, now));
    const createdPrev = deals.filter((d) => inRange(d.created_at, pStart, mStart));

    // Fallback a leads cuando todavía no hay deals (CRM nuevo con historial de leads)
    const hasDeals = deals.length > 0;
    const leadsWonMonth = leads.filter((l) => l.status === 'won' && inRange(l.updated_at, mStart, now));
    const leadsWonPrev = leads.filter((l) => l.status === 'won' && inRange(l.updated_at, pStart, mStart));
    const leadsLostMonth = leads.filter((l) => l.status === 'lost' && inRange(l.updated_at, mStart, now));
    const leadsLostPrev = leads.filter((l) => l.status === 'lost' && inRange(l.updated_at, pStart, mStart));

    const actsToday = acts.filter((a) => inRange(a.occurred_at, dStart, now));
    const actsYesterday = acts.filter((a) => inRange(a.occurred_at, yStart, dStart));

    const closeRate = (w, l) => (w + l ? Math.round((w / (w + l)) * 100) : null);

    const kpis = {
      pipeline_total: {
        value: sum(open, (d) => d.value),
        currency: open[0]?.currency || 'USD',
        open_count: open.length,
        new_this_month: sum(createdMonth, (d) => d.value),
        new_prev_month: sum(createdPrev, (d) => d.value),
        basis: 'deals',
      },
      closed_month: hasDeals
        ? { value: wonMonth.length, amount: sum(wonMonth, (d) => d.value), prev: wonPrev.length, basis: 'deals' }
        : { value: leadsWonMonth.length, amount: null, prev: leadsWonPrev.length, basis: 'leads' },
      activities_today: { value: actsToday.length, prev: actsYesterday.length, basis: 'activities', compare: 'ayer' },
      close_rate: hasDeals
        ? { value: closeRate(wonMonth.length, lostMonth.length), prev: closeRate(wonPrev.length, lostPrev.length), basis: 'deals' }
        : { value: closeRate(leadsWonMonth.length, leadsLostMonth.length), prev: closeRate(leadsWonPrev.length, leadsLostPrev.length), basis: 'leads' },
    };

    // Objetivo del trimestre
    const target = settingR.data[0]?.value || null;
    const wonQuarter = won.filter((d) => inRange(d.won_at, qStart, qEnd));
    const quarterLabel = `Q${qNum} ${now.getFullYear()}`;
    const quarter = {
      label: quarterLabel,
      setting_key: targetKey,
      from: qStart.toISOString(),
      to: qEnd.toISOString(),
      achieved: sum(wonQuarter, (d) => d.value),
      achieved_count: wonQuarter.length,
      target_amount: target?.amount != null ? Number(target.amount) : null,
      currency: target?.currency || open[0]?.currency || 'USD',
      settings_missing: settingR.missing,
    };
    quarter.progress_pct = quarter.target_amount ? Math.min(100, pct(quarter.achieved, quarter.target_amount)) : null;

    // Kanban resumido: todos los deals abiertos + ganados/perdidos de los últimos 30 días
    const cut30 = now.getTime() - 30 * 86400000;
    const lastActByDeal = {};
    for (const a of acts) {
      if (a.deal_id && (!lastActByDeal[a.deal_id] || a.occurred_at > lastActByDeal[a.deal_id])) lastActByDeal[a.deal_id] = a.occurred_at;
    }
    const board = deals
      .filter((d) => d.status === 'open' || new Date(d.won_at || d.lost_at || d.updated_at).getTime() >= cut30)
      .map((d) => ({
        ...d,
        owner: d.owner_id ? users[d.owner_id] || null : null,
        days_in_stage: d.stage_entered_at ? Math.max(0, Math.floor((now - new Date(d.stage_entered_at)) / 86400000)) : null,
        last_activity_at: lastActByDeal[d.id] || null,
      }));

    // Headline: calientes hoy
    const hotLeads = leads.filter((l) => l.classification === 'hot' && ['new', 'contacted', 'qualified'].includes(l.status));
    const negotiating = open.filter((d) => d.stage === 'negociacion').sort((a, b) => Number(b.value) - Number(a.value));
    const topDeal = negotiating[0] || open.sort((a, b) => Number(b.value) - Number(a.value))[0] || null;
    const topHotLead = hotLeads.sort((a, b) => (b.score || 0) - (a.score || 0))[0] || null;

    return res.json({
      ok: true,
      generated_at: now.toISOString(),
      kpis,
      quarter,
      stages,
      board,
      headline: {
        hot_leads: hotLeads.length,
        negotiating: negotiating.length,
        pending_decisions: decR.missing ? 0 : (decR.count ?? 0),
        next_meetings: meetR.data,
        top_deal: topDeal ? { id: topDeal.id, title: topDeal.title, value: topDeal.value, currency: topDeal.currency, company: topDeal.companies?.name || null } : null,
        top_hot_lead: topHotLead ? { id: topHotLead.id, name: topHotLead.name, score: topHotLead.score } : null,
      },
      missing_tables: [dealsR.missing && 'deals', actsR.missing && 'activities', settingR.missing && 'crm_settings'].filter(Boolean),
    });
  } catch (err) {
    logger.error({ msg: 'crm/dashboard falló', error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Contactos = leads en estado won (+ contact/company/deal si existen) ──────
async function loadWonLeads({ q } = {}) {
  let query = supabase
    .from('leads')
    .select('id, name, email, contact, contact_type, source, status, score, classification, next_action, message, sdr_notes, company_name, company_id, converted_contact_id, converted_deal_id, linkedin_url, created_at, updated_at')
    .eq('status', 'won')
    .order('updated_at', { ascending: false })
    .limit(500);
  if (q) {
    const safe = String(q).trim().replace(/[%*,()"\\]/g, '').slice(0, 80);
    if (safe) query = query.or(`name.ilike."%${safe}%",email.ilike."%${safe}%",company_name.ilike."%${safe}%"`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const leads = data || [];
  if (!leads.length) return [];

  const ids = leads.map((l) => l.id);
  const contactIds = leads.map((l) => l.converted_contact_id).filter(Boolean);
  const companyIds = leads.map((l) => l.company_id).filter(Boolean);
  const emails = leads.map((l) => (l.email || '').toLowerCase()).filter(Boolean);

  const [contactsR, companiesR, dealsR, actsR, perfilesR, users] = await Promise.all([
    contactIds.length ? safeSelect('contacts', (qq) => qq.select('id, name, email, phone, role, company_id, owner_id, companies(id, name)').in('id', contactIds)) : { data: [] },
    companyIds.length ? safeSelect('companies', (qq) => qq.select('id, name, industry, website, city').in('id', companyIds)) : { data: [] },
    safeSelect('deals', (qq) => qq.select('id, title, value, currency, stage, status, probability, lead_id, owner_id, stage_entered_at, updated_at').in('lead_id', ids).order('updated_at', { ascending: false })),
    safeSelect('activities', (qq) => qq.select('id, lead_id, type, title, occurred_at').in('lead_id', ids).order('occurred_at', { ascending: false }).limit(1000)),
    emails.length ? safeSelect('perfiles', (qq) => qq.select('email, empresa, cargo, rubro, ciudad, score_potencial, oferta_estimada').in('email', emails)) : { data: [] },
    usersMap(),
  ]);

  const contactBy = Object.fromEntries(contactsR.data.map((c) => [c.id, c]));
  const companyBy = Object.fromEntries(companiesR.data.map((c) => [c.id, c]));
  const dealsBy = {};
  for (const d of dealsR.data) (dealsBy[d.lead_id] ||= []).push(d);
  const lastActBy = {};
  for (const a of actsR.data) if (!lastActBy[a.lead_id]) lastActBy[a.lead_id] = a;
  const perfilBy = Object.fromEntries(perfilesR.data.map((p) => [String(p.email).toLowerCase(), p]));

  return leads.map((l) => {
    const contact = l.converted_contact_id ? contactBy[l.converted_contact_id] || null : null;
    const company = (l.company_id && companyBy[l.company_id]) || contact?.companies || null;
    const deals = dealsBy[l.id] || [];
    const mainDeal = deals.find((d) => d.id === l.converted_deal_id) || deals[0] || null;
    const perfil = perfilBy[(l.email || '').toLowerCase()] || null;
    const ownerId = mainDeal?.owner_id || contact?.owner_id || null;
    const lastAct = lastActBy[l.id] || null;
    return {
      ...l,
      contact,
      company,
      perfil,
      deal: mainDeal,
      deals_count: deals.length,
      owner: ownerId ? users[ownerId] || null : null,
      last_activity_at: lastAct?.occurred_at || l.updated_at,
      last_activity_title: lastAct?.title || null,
    };
  });
}

router.get('/contacts-won', async (req, res) => {
  try {
    let rows = await loadWonLeads({ q: req.query.q });
    const stage = req.query.stage;
    if (stage) rows = rows.filter((r) => (r.deal?.stage || 'sin_deal') === stage);
    return res.json({ ok: true, contacts: rows, count: rows.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/contacts-won/:leadId/timeline', async (req, res) => {
  const leadId = req.params.leadId;
  try {
    const { data: lead, error } = await supabase.from('leads').select('*').eq('id', leadId).single();
    if (error) return res.status(404).json({ ok: false, error: 'Lead no encontrado' });
    const email = (lead.email || '').toLowerCase();

    const [rows] = await Promise.all([loadWonLeadsById(leadId)]);
    const summary = rows[0] || { ...lead };

    const dealIds = [lead.converted_deal_id].filter(Boolean);
    const [acts, meets, runs, briefs, reuns, tasksR, decs] = await Promise.all([
      safeSelect('activities', (q) => {
        const or = [`lead_id.eq.${leadId}`];
        if (lead.converted_contact_id) or.push(`contact_id.eq.${lead.converted_contact_id}`);
        if (dealIds.length) or.push(`deal_id.eq.${dealIds[0]}`);
        return q.select('id, type, title, body, occurred_at, agent_id, author_user_id').or(or.join(',')).order('occurred_at', { ascending: false }).limit(200);
      }),
      safeSelect('meetings', (q) => q.select('id, scheduled_at, type, status, notes, calendar_link').eq('lead_id', leadId)),
      safeSelect('agent_runs', (q) => q.select('id, agent_id, status, created_at, duration_ms, error').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(50)),
      safeSelect('briefings', (q) => (email ? q.select('id, status, resumen_ejecutivo, updated_at, created_at, lead_id, lead_email').or(`lead_id.eq.${leadId},lead_email.eq."${email}"`) : q.select('id, status, resumen_ejecutivo, updated_at, created_at').eq('lead_id', leadId))),
      safeSelect('reuniones', (q) => (email ? q.select('id, titulo, fecha, status, score_cierre, nivel_interes, resumen, lead_id, lead_email').or(`lead_id.eq.${leadId},lead_email.eq."${email}"`) : q.select('id, titulo, fecha, status, score_cierre, nivel_interes, resumen').eq('lead_id', leadId))),
      safeSelect('tasks', (q) => q.select('id, title, due_at, done_at, assignee_user_id').eq('lead_id', leadId)),
      safeSelect('agent_decisions', (q) => q.select('id, agent_id, decision_type, status, title, created_at, decided_at').eq('lead_id', leadId)),
    ]);

    const users = await usersMap();
    const events = [];
    events.push({ ts: lead.created_at, kind: 'lead', title: 'Lead creado', body: `Fuente: ${lead.source || '—'}`, icon: 'user' });
    if (lead.status === 'won') events.push({ ts: lead.updated_at, kind: 'won', title: 'Marcado como Ganado', body: null, icon: 'trophy' });
    for (const a of acts.data) events.push({ ts: a.occurred_at, kind: a.type === 'agent' ? 'agent' : 'activity', subtype: a.type, title: a.title, body: a.body, by: a.agent_id || (a.author_user_id ? users[a.author_user_id]?.name : null), icon: a.type });
    for (const m of meets.data) events.push({ ts: m.scheduled_at, kind: 'meeting', title: `Reunión ${m.type || ''} · ${m.status}`, body: m.notes, link: m.calendar_link, icon: 'calendar' });
    for (const r of runs.data) events.push({ ts: r.created_at, kind: 'agent_run', title: `Agente ${r.agent_id} · ${r.status}`, body: r.error || null, icon: 'bot' });
    for (const b of briefs.data) events.push({ ts: b.updated_at || b.created_at, kind: 'briefing', title: `Briefing · ${b.status}`, body: b.resumen_ejecutivo, href: '#agent/briefing', icon: 'doc' });
    for (const r of reuns.data) events.push({ ts: r.fecha || r.created_at, kind: 'reunion', title: `Reunión analizada · ${r.titulo || ''}`, body: r.resumen, meta: r.score_cierre != null ? `score cierre ${r.score_cierre}` : null, href: '#agent/reuniones', icon: 'mic' });
    for (const t of tasksR.data) events.push({ ts: t.done_at || t.due_at || null, kind: 'task', title: `${t.done_at ? '✓ ' : ''}${t.title}`, body: t.due_at ? `Vence ${t.due_at}` : null, icon: 'task' });
    for (const d of decs.data) events.push({ ts: d.decided_at || d.created_at, kind: 'decision', title: `${d.title} · ${d.status}`, body: `${d.agent_id} · ${d.decision_type}`, href: '#inbox', icon: 'inbox' });

    events.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
    return res.json({ ok: true, contact: summary, events });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

async function loadWonLeadsById(leadId) {
  const { data, error } = await supabase.from('leads').select('id, email').eq('id', leadId).single();
  if (error || !data) return [];
  const rows = await loadWonLeads({});
  const found = rows.filter((r) => r.id === leadId);
  if (found.length) return found;
  // lead no ganado: devolver igual datos básicos
  return [];
}

// ─── POST /api/crm/sync-won — convierte leads ganados sin contact/deal usando el mecanismo existente
router.post('/sync-won', async (req, res) => {
  try {
    const includeQualified = Boolean(req.body?.include_qualified);
    const statuses = includeQualified ? ['won', 'qualified'] : ['won'];
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .in('status', statuses)
      .is('converted_contact_id', null)
      .limit(200);
    if (error) throw new Error(error.message);
    const { onLeadStatusChange } = require('../lib/crmConvert');
    const results = [];
    for (const lead of data || []) {
      const r = await onLeadStatusChange(lead, lead.status, { ownerId: req.user?.id || null });
      results.push({ lead_id: lead.id, ok: !r.error, error: r.error || null });
    }
    return res.json({ ok: true, processed: results.length, results });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /api/crm/companies-grouped ───────────────────────────────────────────
router.get('/companies-grouped', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().replace(/[%*,()"\\]/g, '').slice(0, 80);
    const [contactsR, companiesR, dealsR, leadsR, users] = await Promise.all([
      safeSelect('contacts', (qq) => qq.select('id, name, email, phone, role, company_id, lead_id, owner_id, created_at').not('company_id', 'is', null)),
      safeSelect('companies', (qq) => (q ? qq.select('*').ilike('name', `%${q}%`) : qq.select('*'))),
      safeSelect('deals', (qq) => qq.select('id, title, value, currency, stage, status, probability, company_id, contact_id, owner_id, updated_at').not('company_id', 'is', null)),
      supabase.from('leads').select('id, name, email, status, score, classification, company_id, converted_contact_id').not('company_id', 'is', null),
      usersMap(),
    ]);
    const leadBy = Object.fromEntries((leadsR.data || []).map((l) => [l.id, l]));
    const contactsByCompany = {};
    for (const c of contactsR.data) (contactsByCompany[c.company_id] ||= []).push({ ...c, lead: c.lead_id ? leadBy[c.lead_id] || null : null, owner: c.owner_id ? users[c.owner_id] || null : null });
    const dealsByCompany = {};
    for (const d of dealsR.data) (dealsByCompany[d.company_id] ||= []).push(d);

    const groups = companiesR.data
      .filter((co) => (contactsByCompany[co.id] || []).length > 0)
      .map((co) => {
        const deals = dealsByCompany[co.id] || [];
        return {
          company: co,
          contacts: contactsByCompany[co.id],
          deals,
          pipeline_value: sum(deals.filter((d) => d.status === 'open'), (d) => d.value),
          won_value: sum(deals.filter((d) => d.status === 'won'), (d) => d.value),
          currency: deals[0]?.currency || 'USD',
        };
      })
      .sort((a, b) => b.contacts.length - a.contacts.length || a.company.name.localeCompare(b.company.name));

    return res.json({
      ok: true,
      groups,
      count: groups.length,
      contacts_without_company: contactsR.missing ? 0 : undefined,
      missing_tables: [contactsR.missing && 'contacts', companiesR.missing && 'companies'].filter(Boolean),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Tasks CRUD (tabla tasks, M9) ─────────────────────────────────────────────
function tasksMissing(res) {
  return res.status(409).json({
    ok: false,
    missing_table: 'tasks',
    error: 'Falta la tabla tasks. Ejecutá scripts/migrations/009_tasks.sql en Supabase.',
  });
}

router.get('/tasks', async (req, res) => {
  try {
    const { data, missing } = await safeSelect('tasks', (q) => {
      let qq = q.select('*').order('done_at', { ascending: true, nullsFirst: true }).order('due_at', { ascending: true, nullsFirst: false }).limit(300);
      if (req.query.assignee) qq = qq.eq('assignee_user_id', req.query.assignee);
      if (req.query.lead_id) qq = qq.eq('lead_id', req.query.lead_id);
      if (req.query.deal_id) qq = qq.eq('deal_id', req.query.deal_id);
      if (req.query.open === '1') qq = qq.is('done_at', null);
      return qq;
    });
    if (missing) return res.json({ ok: true, tasks: [], missing_table: 'tasks' });
    return res.json({ ok: true, tasks: data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.title || !String(b.title).trim()) return res.status(400).json({ ok: false, error: 'title requerido' });
    const row = {
      title: String(b.title).trim(),
      body: b.body || null,
      due_at: b.due_at || null,
      priority: ['low', 'normal', 'high'].includes(b.priority) ? b.priority : 'normal',
      assignee_user_id: b.assignee_user_id || req.user?.id || null,
      created_by: req.user?.id || null,
      lead_id: b.lead_id || null,
      deal_id: b.deal_id || null,
      contact_id: b.contact_id || null,
      company_id: b.company_id || null,
    };
    const { data, error } = await supabase.from('tasks').insert(row).select().single();
    if (error) {
      if (isMissingTable(error)) return tasksMissing(res);
      throw new Error(error.message);
    }
    return res.status(201).json({ ok: true, task: data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.patch('/tasks/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const row = { updated_at: new Date().toISOString() };
    for (const k of ['title', 'body', 'due_at', 'priority', 'assignee_user_id', 'lead_id', 'deal_id', 'contact_id', 'company_id']) {
      if (b[k] !== undefined) row[k] = b[k];
    }
    if (b.done !== undefined) row.done_at = b.done ? new Date().toISOString() : null;
    const { data, error } = await supabase.from('tasks').update(row).eq('id', req.params.id).select().single();
    if (error) {
      if (isMissingTable(error)) return tasksMissing(res);
      throw new Error(error.message);
    }
    return res.json({ ok: true, task: data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('tasks').delete().eq('id', req.params.id);
    if (error) {
      if (isMissingTable(error)) return tasksMissing(res);
      throw new Error(error.message);
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /api/crm/agenda — tareas manuales + pendientes derivados ─────────────
router.get('/agenda', async (req, res) => {
  try {
    const now = new Date();
    const cut3 = new Date(now.getTime() - 3 * 86400000).toISOString();
    const [tasksR, meetR, decR, briefR, leadsR, dealsR, users] = await Promise.all([
      safeSelect('tasks', (q) => q.select('*').is('done_at', null).order('due_at', { ascending: true, nullsFirst: false }).limit(300)),
      safeSelect('meetings', (q) => q.select('id, lead_id, scheduled_at, type, status, notes, leads(name, email)').eq('status', 'scheduled').order('scheduled_at').limit(100)),
      safeSelect('agent_decisions', (q) => q.select('id, agent_id, decision_type, title, summary, lead_id, deal_id, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(100)),
      safeSelect('briefings', (q) => q.select('id, lead_email, lead_id, status, resumen_ejecutivo, updated_at').eq('status', 'DRAFT').order('updated_at', { ascending: false }).limit(100)),
      supabase.from('leads').select('id, name, email, status, classification, score, next_action, updated_at').in('classification', ['hot', 'warm']).in('status', ['new', 'contacted']).lt('updated_at', cut3).order('score', { ascending: false }).limit(100),
      safeSelect('deals', (q) => q.select('id, title, value, currency, stage, expected_close, owner_id, companies(name)').eq('status', 'open').not('expected_close', 'is', null).order('expected_close').limit(100)),
      usersMap(),
    ]);

    const items = [];
    for (const t of tasksR.data) {
      items.push({
        id: `task:${t.id}`, source: 'tasks', raw_id: t.id, kind: 'task', title: t.title, subtitle: t.body || null,
        due_at: t.due_at, priority: t.priority, assignee_id: t.assignee_user_id, assignee: t.assignee_user_id ? users[t.assignee_user_id] || null : null,
        lead_id: t.lead_id, deal_id: t.deal_id, href: t.lead_id ? `#contacts/${t.lead_id}` : t.deal_id ? '#deals' : null, can_complete: true,
      });
    }
    for (const m of meetR.data) {
      items.push({
        id: `meeting:${m.id}`, source: 'meetings', raw_id: m.id, kind: 'meeting', title: `Reunión ${m.type || ''} · ${m.leads?.name || 'lead'}`, subtitle: m.notes || m.leads?.email || null,
        due_at: m.scheduled_at, assignee_id: null, assignee: null, lead_id: m.lead_id, href: '#calendar', can_complete: false,
      });
    }
    for (const d of decR.data) {
      items.push({
        id: `decision:${d.id}`, source: 'agent_decisions', raw_id: d.id, kind: 'approval', title: d.title, subtitle: `${d.agent_id} · ${d.decision_type}`,
        due_at: null, created_at: d.created_at, assignee_id: null, assignee: null, lead_id: d.lead_id, deal_id: d.deal_id, href: '#inbox', can_complete: false,
      });
    }
    for (const b of briefR.data) {
      items.push({
        id: `briefing:${b.id}`, source: 'briefings', raw_id: b.id, kind: 'briefing', title: `Briefing por revisar · ${b.lead_email}`, subtitle: (b.resumen_ejecutivo || '').slice(0, 140) || null,
        due_at: null, created_at: b.updated_at, assignee_id: null, assignee: null, lead_id: b.lead_id, href: '#agent/briefing', can_complete: false,
      });
    }
    for (const l of leadsR.data || []) {
      items.push({
        id: `followup:${l.id}`, source: 'leads', raw_id: l.id, kind: 'followup', title: `Seguimiento vencido · ${l.name || l.email || 'lead'}`, subtitle: `${l.classification} · score ${l.score ?? '—'} · ${l.next_action || ''}`,
        due_at: new Date(new Date(l.updated_at).getTime() + 3 * 86400000).toISOString(), assignee_id: null, assignee: null, lead_id: l.id, href: '#leads', can_complete: false,
      });
    }
    for (const d of dealsR.data) {
      items.push({
        id: `deal:${d.id}`, source: 'deals', raw_id: d.id, kind: 'deal_close', title: `Cierre previsto · ${d.title}`, subtitle: `${d.companies?.name || ''} · ${d.stage}`.trim(),
        due_at: d.expected_close, assignee_id: d.owner_id, assignee: d.owner_id ? users[d.owner_id] || null : null, deal_id: d.id, href: '#deals', can_complete: false, value: d.value, currency: d.currency,
      });
    }
    for (const it of items) {
      it.overdue = Boolean(it.due_at && new Date(it.due_at) < now);
    }
    items.sort((a, b) => {
      const ad = a.due_at ? new Date(a.due_at).getTime() : Infinity;
      const bd = b.due_at ? new Date(b.due_at).getTime() : Infinity;
      return ad - bd;
    });
    return res.json({ ok: true, items, users: Object.values(users), tasks_table: !tasksR.missing });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GET /api/crm/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD ─────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const now = new Date();
    const to = req.query.to ? new Date(`${req.query.to}T23:59:59`) : now;
    const from = req.query.from ? new Date(`${req.query.from}T00:00:00`) : new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const fromIso = from.toISOString();
    const toIso = to.toISOString();

    const [leadsR, dealsR, actsR, runsR, perfR, monthlyR, users] = await Promise.all([
      supabase.from('leads').select('id, source, status, classification, score, created_at, updated_at').gte('created_at', fromIso).lte('created_at', toIso).limit(5000),
      safeSelect('deals', (q) => q.select('id, value, currency, stage, status, owner_id, created_at, won_at, lost_at, source').limit(2000)),
      safeSelect('activities', (q) => q.select('id, type, author_user_id, agent_id, occurred_at').gte('occurred_at', fromIso).lte('occurred_at', toIso).limit(5000)),
      safeSelect('agent_runs', (q) => q.select('id, agent_id, status, tokens_used, duration_ms, created_at').gte('created_at', fromIso).lte('created_at', toIso).limit(5000)),
      safeSelect('performance_reports', (q) => q.select('id, client_id, period_since, period_until, status, channels, analysis, created_at, clients(company)').gte('period_until', from.toISOString().slice(0, 10)).lte('period_since', to.toISOString().slice(0, 10)).order('period_since', { ascending: false }).limit(50)),
      safeSelect('monthly_reports', (q) => q.select('id, client_id, month, status, report, created_at, clients(company)').order('month', { ascending: false }).limit(50)),
      usersMap(),
    ]);
    if (leadsR.error) throw new Error(leadsR.error.message);
    const leads = leadsR.data || [];

    // Embudo por fuente (source × status)
    const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'];
    const funnel = {};
    for (const l of leads) {
      const s = l.source || 'desconocida';
      funnel[s] ||= { source: s, total: 0, new: 0, contacted: 0, qualified: 0, won: 0, lost: 0, hot: 0, warm: 0, cold: 0, score_sum: 0, score_n: 0 };
      funnel[s].total++;
      if (STATUSES.includes(l.status)) funnel[s][l.status]++;
      if (['hot', 'warm', 'cold'].includes(l.classification)) funnel[s][l.classification]++;
      if (l.score != null) { funnel[s].score_sum += l.score; funnel[s].score_n++; }
    }
    const funnelRows = Object.values(funnel)
      .map((r) => ({ ...r, avg_score: r.score_n ? Math.round(r.score_sum / r.score_n) : null, conv_qualified_pct: pct(r.qualified + r.won, r.total), conv_won_pct: pct(r.won, r.total) }))
      .sort((a, b) => b.total - a.total);
    const totals = { total: leads.length, contacted: 0, qualified: 0, won: 0, lost: 0 };
    for (const l of leads) {
      if (['contacted', 'qualified', 'won'].includes(l.status)) totals.contacted++;
      if (['qualified', 'won'].includes(l.status)) totals.qualified++;
      if (l.status === 'won') totals.won++;
      if (l.status === 'lost') totals.lost++;
    }

    // Deals cerrados por mes (en rango) + por responsable
    const dealsWon = dealsR.data.filter((d) => d.status === 'won' && inRange(d.won_at, from, to));
    const dealsLost = dealsR.data.filter((d) => d.status === 'lost' && inRange(d.lost_at, from, to));
    const byMonth = {};
    for (const d of dealsWon) {
      const k = String(d.won_at).slice(0, 7);
      byMonth[k] ||= { month: k, won_count: 0, won_value: 0, lost_count: 0 };
      byMonth[k].won_count++; byMonth[k].won_value += Number(d.value) || 0;
    }
    for (const d of dealsLost) {
      const k = String(d.lost_at).slice(0, 7);
      byMonth[k] ||= { month: k, won_count: 0, won_value: 0, lost_count: 0 };
      byMonth[k].lost_count++;
    }
    const byOwner = {};
    for (const d of dealsR.data.filter((x) => inRange(x.created_at, from, to) || inRange(x.won_at, from, to))) {
      const k = d.owner_id || 'sin_responsable';
      byOwner[k] ||= { user: users[d.owner_id] || { id: null, name: 'Sin responsable' }, deals: 0, won: 0, won_value: 0, open_value: 0 };
      byOwner[k].deals++;
      if (d.status === 'won') { byOwner[k].won++; byOwner[k].won_value += Number(d.value) || 0; }
      if (d.status === 'open') byOwner[k].open_value += Number(d.value) || 0;
    }

    // Actividad por responsable y tipo
    const actByUser = {};
    for (const a of actsR.data) {
      const k = a.type === 'agent' ? `agent:${a.agent_id || 'agent'}` : (a.author_user_id || 'sin_autor');
      actByUser[k] ||= { key: k, name: a.type === 'agent' ? `Agente ${a.agent_id || ''}`.trim() : (users[a.author_user_id]?.name || 'Sin autor'), is_agent: a.type === 'agent', total: 0, call: 0, email: 0, note: 0, task: 0, agent: 0 };
      actByUser[k].total++;
      actByUser[k][a.type] = (actByUser[k][a.type] || 0) + 1;
    }

    // Agentes: runs por agente
    const runsBy = {};
    for (const r of runsR.data) {
      runsBy[r.agent_id] ||= { agent_id: r.agent_id, runs: 0, completed: 0, failed: 0, tokens: 0, ms: 0 };
      runsBy[r.agent_id].runs++;
      if (r.status === 'completed') runsBy[r.agent_id].completed++;
      if (r.status === 'failed') runsBy[r.agent_id].failed++;
      runsBy[r.agent_id].tokens += Number(r.tokens_used) || 0;
      runsBy[r.agent_id].ms += Number(r.duration_ms) || 0;
    }

    // Campañas (Performance) y reportes mensuales (Reporting) en el período
    const campaigns = perfR.data.map((p) => ({
      id: p.id, client: p.clients?.company || null, period_since: p.period_since, period_until: p.period_until, status: p.status, channels: p.channels || [],
      summary: p.analysis?.summary || null, alerts: (p.analysis?.alerts || []).length, recommendations: (p.analysis?.recommendations || []).length, pending_actions: (p.analysis?.actions_pending_approval || []).length,
    }));
    const monthly = monthlyR.data
      .filter((m) => { const k = String(m.month); return k >= fromIso.slice(0, 7) && k <= toIso.slice(0, 7); })
      .map((m) => ({ id: m.id, client: m.clients?.company || null, month: m.month, status: m.status, headline: m.report?.headline || null, key_metrics: m.report?.key_metrics || [], wins: m.report?.wins || [] }));

    return res.json({
      ok: true,
      range: { from: fromIso, to: toIso },
      leads: { totals, funnel: funnelRows },
      deals: { won_count: dealsWon.length, won_value: sum(dealsWon, (d) => d.value), lost_count: dealsLost.length, by_month: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)), by_owner: Object.values(byOwner) },
      activity: { total: actsR.data.length, by_actor: Object.values(actByUser).sort((a, b) => b.total - a.total) },
      agents: Object.values(runsBy).sort((a, b) => b.runs - a.runs),
      campaigns,
      monthly_reports: monthly,
      missing_tables: [dealsR.missing && 'deals', actsR.missing && 'activities'].filter(Boolean),
    });
  } catch (err) {
    logger.error({ msg: 'crm/analytics falló', error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
