const supabase = require('./client');

async function upsertLead(leadData) {
  if (leadData.external_id && leadData.source) {
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('source', leadData.source)
      .eq('external_id', leadData.external_id)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('leads')
        .update({ ...leadData, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(`Error actualizando Lead: ${error.message}`);
      return { lead: data, created: false };
    }
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({ ...leadData, status: leadData.status || 'new' })
    .select()
    .single();

  if (error) throw new Error(`Error creando Lead: ${error.message}`);
  return { lead: data, created: true };
}

async function getLead(id) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Error obteniendo Lead: ${error.message}`);
  return data;
}

async function updateLeadStatus(id, status) {
  const validStatuses = ['new', 'contacted', 'qualified', 'lost', 'won'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Status inválido: ${status}. Valores válidos: ${validStatuses.join(', ')}`);
  }

  const { data, error } = await supabase
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error actualizando status del Lead: ${error.message}`);
  return data;
}

/** Actualiza campos de scoring tras correr el Agente SDR */
async function updateLeadScoring(id, { score, classification, next_action, status, sdr_notes }) {
  const { data, error } = await supabase
    .from('leads')
    .update({
      score,
      classification,
      next_action,
      status: status || 'new',
      sdr_notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error actualizando scoring del Lead: ${error.message}`);
  return data;
}

/** Guarda el diagnóstico del Agente 02 contra el lead */
async function updateLeadDiagnosis(id, { diagnosis, status }) {
  const { data, error } = await supabase
    .from('leads')
    .update({
      diagnosis,
      status: status || 'qualified',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error guardando diagnóstico: ${error.message}`);
  return data;
}

/** Guarda la propuesta del Agente 03 contra el lead */
async function updateLeadProposal(id, { proposal, proposal_status }) {
  const { data, error } = await supabase
    .from('leads')
    .update({
      proposal,
      proposal_status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error guardando propuesta: ${error.message}`);
  return data;
}

module.exports = {
  upsertLead,
  getLead,
  updateLeadStatus,
  updateLeadScoring,
  updateLeadDiagnosis,
  updateLeadProposal,
};
