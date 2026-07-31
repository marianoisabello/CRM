'use strict';

const supabase = require('./client');

async function listDecisions({ status, agent_id, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('agent_decisions')
    .select('*')
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (status) query = query.eq('status', status);
  if (agent_id) query = query.eq('agent_id', agent_id);

  const { data, error } = await query;
  if (error) throw new Error(`Error listando agent_decisions: ${error.message}`);
  return data || [];
}

async function getDecision(id) {
  const { data, error } = await supabase
    .from('agent_decisions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(`Error obteniendo agent_decision: ${error.message}`);
  return data;
}

async function createDecision(payload) {
  if (!payload.agent_id) throw new Error('agent_id es requerido');
  if (!payload.decision_type) throw new Error('decision_type es requerido');
  if (!payload.title) throw new Error('title es requerido');

  const row = {
    agent_id: payload.agent_id,
    decision_type: payload.decision_type,
    status: payload.status || 'pending',
    title: payload.title,
    summary: payload.summary || null,
    payload: payload.payload || {},
    lead_id: payload.lead_id || null,
    deal_id: payload.deal_id || null,
    contact_id: payload.contact_id || null,
    company_id: payload.company_id || null,
    agent_run_id: payload.agent_run_id || null,
  };

  const { data, error } = await supabase.from('agent_decisions').insert(row).select().single();
  if (error) throw new Error(`Error creando agent_decision: ${error.message}`);
  return data;
}

async function decide(id, { status, decided_by }) {
  const valid = ['approved', 'rejected', 'executed'];
  if (!valid.includes(status)) throw new Error(`status de decisión inválido: ${status}`);

  const { data, error } = await supabase
    .from('agent_decisions')
    .update({
      status,
      decided_by: decided_by || null,
      decided_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error actualizando agent_decision: ${error.message}`);
  return data;
}

module.exports = {
  listDecisions,
  getDecision,
  createDecision,
  decide,
};
