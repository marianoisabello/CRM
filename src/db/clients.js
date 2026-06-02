'use strict';

const supabase = require('./client');

/** Un lead "won" se convierte en client */
async function createClientFromLead(leadId, { company = null, monthlyBudget = null, services = [] } = {}) {
  const { data, error } = await supabase
    .from('clients')
    .insert({
      lead_id: leadId,
      company,
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
