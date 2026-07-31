'use strict';

const supabase = require('./client');

/** Un lead "won" se convierte en client (idempotente por lead_id). */
async function createClientFromLead(
  leadId,
  { company = null, company_id = null, monthlyBudget = null, services = [] } = {}
) {
  const { data: existing } = await supabase
    .from('clients')
    .select('*')
    .eq('lead_id', leadId)
    .maybeSingle();
  if (existing) {
    const patch = {};
    if (company_id && !existing.company_id) patch.company_id = company_id;
    if (company && !existing.company) patch.company = company;
    if (Object.keys(patch).length) {
      const { data, error } = await supabase
        .from('clients')
        .update(patch)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new Error(`Error actualizando Client: ${error.message}`);
      return data;
    }
    return existing;
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      lead_id: leadId,
      company,
      company_id: company_id || null,
      monthly_budget: monthlyBudget,
      services,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw new Error(`Error creando Client: ${error.message}`);
  return data;
}

async function getClient(id) {
  const { data, error } = await supabase
    .from('clients')
    .select('*, leads(*)')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Error obteniendo Client: ${error.message}`);
  return data;
}

async function listClients({ status = 'active' } = {}) {
  const { data, error } = await supabase
    .from('clients')
    .select('*, leads(name, email, contact)')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Error listando Clients: ${error.message}`);
  return data;
}

module.exports = { createClientFromLead, getClient, listClients };
