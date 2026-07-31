'use strict';

const supabase = require('./client');
const { getStageByKey } = require('./pipelineStages');

async function listDeals({
  q,
  stage,
  status,
  company_id,
  contact_id,
  limit = 50,
  offset = 0,
} = {}) {
  let query = supabase
    .from('deals')
    .select('*, contacts(id, name, email), companies(id, name)')
    .order('updated_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (stage) query = query.eq('stage', stage);
  if (status) query = query.eq('status', status);
  if (company_id) query = query.eq('company_id', company_id);
  if (contact_id) query = query.eq('contact_id', contact_id);
  if (q) {
    const safe = String(q).trim().replace(/[%*,()"\\]/g, '').slice(0, 80);
    if (safe) query = query.ilike('title', `%${safe}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Error listando deals: ${error.message}`);
  return data || [];
}

async function getDeal(id) {
  const { data, error } = await supabase
    .from('deals')
    .select('*, contacts(id, name, email, phone, role), companies(id, name, website), leads(id, name, email, status, score)')
    .eq('id', id)
    .single();
  if (error) throw new Error(`Error obteniendo deal: ${error.message}`);
  return data;
}

async function createDeal(payload) {
  if (!payload.title || !String(payload.title).trim()) {
    throw new Error('title es requerido');
  }
  const stage = payload.stage || 'prospeccion';
  const stageRow = await getStageByKey(stage);
  if (!stageRow) throw new Error(`Stage inválido: ${stage}`);

  let status = payload.status || 'open';
  if (stageRow.is_won) status = 'won';
  if (stageRow.is_lost) status = 'lost';

  const row = {
    title: String(payload.title).trim(),
    value: payload.value != null ? Number(payload.value) : 0,
    currency: payload.currency || 'USD',
    stage,
    probability: payload.probability != null ? Number(payload.probability) : 0,
    expected_close: payload.expected_close || null,
    stage_entered_at: new Date().toISOString(),
    contact_id: payload.contact_id || null,
    company_id: payload.company_id || null,
    lead_id: payload.lead_id || null,
    owner_id: payload.owner_id || null,
    source: payload.source || null,
    status,
    notes: payload.notes || null,
    won_at: status === 'won' ? new Date().toISOString() : null,
    lost_at: status === 'lost' ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase.from('deals').insert(row).select().single();
  if (error) throw new Error(`Error creando deal: ${error.message}`);
  return data;
}

async function updateDeal(id, patch) {
  const allowed = [
    'title', 'value', 'currency', 'probability', 'expected_close',
    'contact_id', 'company_id', 'lead_id', 'owner_id', 'source', 'notes',
  ];
  const row = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (patch[k] !== undefined) row[k] = patch[k];
  }

  const { data, error } = await supabase
    .from('deals')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Error actualizando deal: ${error.message}`);
  return data;
}

async function updateDealStage(id, stage) {
  const stageRow = await getStageByKey(stage);
  if (!stageRow || !stageRow.active) throw new Error(`Stage inválido: ${stage}`);

  const patch = {
    stage,
    stage_entered_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'open',
    won_at: null,
    lost_at: null,
  };
  if (stageRow.is_won) {
    patch.status = 'won';
    patch.probability = 100;
    patch.won_at = new Date().toISOString();
  } else if (stageRow.is_lost) {
    patch.status = 'lost';
    patch.lost_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('deals')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Error cambiando stage del deal: ${error.message}`);

  // Activity de sistema (tipo agent) — best effort
  try {
    const { createActivity } = require('./activities');
    await createActivity({
      deal_id: id,
      contact_id: data.contact_id,
      company_id: data.company_id,
      lead_id: data.lead_id,
      type: 'agent',
      title: `Stage → ${stageRow.name}`,
      body: `Pipeline actualizado a «${stageRow.name}»`,
      agent_id: 'system',
    });
  } catch (_) { /* no bloquear stage change */ }

  return data;
}

async function deleteDeal(id) {
  const { error } = await supabase.from('deals').delete().eq('id', id);
  if (error) throw new Error(`Error eliminando deal: ${error.message}`);
  return true;
}

/** Métricas simples para reporting / dashboard */
async function getDealMetrics() {
  const { data, error } = await supabase
    .from('deals')
    .select('id, value, status, stage, stage_entered_at, won_at, created_at');
  if (error) throw new Error(`Error métricas deals: ${error.message}`);

  const rows = data || [];
  const open = rows.filter((d) => d.status === 'open');
  const won = rows.filter((d) => d.status === 'won');
  const lost = rows.filter((d) => d.status === 'lost');
  const pipelineTotal = open.reduce((s, d) => s + Number(d.value || 0), 0);
  const wonValue = won.reduce((s, d) => s + Number(d.value || 0), 0);
  const closed = won.length + lost.length;
  const winRate = closed ? Math.round((won.length / closed) * 100) : 0;

  let avgDays = 0;
  const withDates = won.filter((d) => d.won_at && d.created_at);
  if (withDates.length) {
    const sum = withDates.reduce((s, d) => {
      const ms = new Date(d.won_at) - new Date(d.created_at);
      return s + ms / 86400000;
    }, 0);
    avgDays = Math.round(sum / withDates.length);
  }

  return {
    open_count: open.length,
    won_count: won.length,
    lost_count: lost.length,
    pipeline_total: pipelineTotal,
    won_value: wonValue,
    win_rate: winRate,
    avg_days_to_close: avgDays,
  };
}

module.exports = {
  listDeals,
  getDeal,
  createDeal,
  updateDeal,
  updateDealStage,
  deleteDeal,
  getDealMetrics,
};
