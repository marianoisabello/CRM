'use strict';

const supabase = require('./client');

/** Devuelve la conversación activa para un número, o null si no hay ninguna */
async function getActive(phone) {
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('phone', phone)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw new Error(`Error buscando conversación activa: ${error.message}`);
  return data;
}

async function create(phone, contactName) {
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .insert({ phone, contact_name: contactName || null, step: 0, answers: {} })
    .select()
    .single();

  if (error) throw new Error(`Error creando conversación: ${error.message}`);
  return data;
}

async function updateProgress(id, { step, answers }) {
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .update({ step, answers, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error actualizando conversación: ${error.message}`);
  return data;
}

async function complete(id, leadId) {
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .update({ status: 'completed', lead_id: leadId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error completando conversación: ${error.message}`);
  return data;
}

module.exports = { getActive, create, updateProgress, complete };
