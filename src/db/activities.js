'use strict';

const supabase = require('./client');

async function listActivities({
  type,
  deal_id,
  contact_id,
  company_id,
  lead_id,
  actor, // 'human' | 'agent' | undefined
  limit = 50,
  offset = 0,
} = {}) {
  let query = supabase
    .from('activities')
    .select('*')
    .order('occurred_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (type) query = query.eq('type', type);
  if (deal_id) query = query.eq('deal_id', deal_id);
  if (contact_id) query = query.eq('contact_id', contact_id);
  if (company_id) query = query.eq('company_id', company_id);
  if (lead_id) query = query.eq('lead_id', lead_id);
  if (actor === 'agent') query = query.eq('type', 'agent');
  if (actor === 'human') query = query.in('type', ['call', 'email', 'note', 'task']);

  const { data, error } = await query;
  if (error) throw new Error(`Error listando activities: ${error.message}`);
  return data || [];
}

async function getActivity(id) {
  const { data, error } = await supabase.from('activities').select('*').eq('id', id).single();
  if (error) throw new Error(`Error obteniendo activity: ${error.message}`);
  return data;
}

async function createActivity(payload) {
  const valid = ['call', 'email', 'note', 'task', 'agent'];
  if (!valid.includes(payload.type)) {
    throw new Error(`type inválido: ${payload.type}`);
  }
  if (!payload.title || !String(payload.title).trim()) {
    throw new Error('title es requerido');
  }

  const row = {
    deal_id: payload.deal_id || null,
    contact_id: payload.contact_id || null,
    company_id: payload.company_id || null,
    lead_id: payload.lead_id || null,
    type: payload.type,
    title: String(payload.title).trim(),
    body: payload.body || null,
    author_user_id: payload.author_user_id || null,
    agent_id: payload.agent_id || null,
    agent_run_id: payload.agent_run_id || null,
    occurred_at: payload.occurred_at || new Date().toISOString(),
  };

  const { data, error } = await supabase.from('activities').insert(row).select().single();
  if (error) throw new Error(`Error creando activity: ${error.message}`);
  return data;
}

async function updateActivity(id, patch) {
  const allowed = ['title', 'body', 'type', 'occurred_at', 'deal_id', 'contact_id', 'company_id', 'lead_id'];
  const row = {};
  for (const k of allowed) {
    if (patch[k] !== undefined) row[k] = patch[k];
  }
  const { data, error } = await supabase
    .from('activities')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Error actualizando activity: ${error.message}`);
  return data;
}

async function deleteActivity(id) {
  const { error } = await supabase.from('activities').delete().eq('id', id);
  if (error) throw new Error(`Error eliminando activity: ${error.message}`);
  return true;
}

module.exports = {
  listActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
};
