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
      // Solo actualizar campos que llegaron con valor — nunca pisar datos existentes con null
      const { data: current } = await supabase
        .from('leads')
        .select('*')
        .eq('id', existing.id)
        .single();

      const merged = { updated_at: new Date().toISOString() };
      for (const [key, val] of Object.entries(leadData)) {
        if (val !== null && val !== undefined && val !== '') {
          merged[key] = val;
        } else if (current[key]) {
          // conservar el valor existente si el nuevo viene vacío
          merged[key] = current[key];
        }
      }
      // El mensaje siempre se actualiza (es el último mensaje recibido)
      if (leadData.message) merged.message = leadData.message;
      // El raw_payload siempre se actualiza
      if (leadData.raw_payload) merged.raw_payload = leadData.raw_payload;

      const { data, error } = await supabase
        .from('leads')
        .update(merged)
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
