'use strict';

const supabase = require('./client');

async function createMeeting({ leadId, scheduledAt, type = 'discovery', notes = null, calendarLink = null }) {
  const { data, error } = await supabase
    .from('meetings')
    .insert({
      lead_id: leadId,
      scheduled_at: scheduledAt,
      type,
      notes,
      calendar_link: calendarLink,
      status: 'scheduled',
    })
    .select()
    .single();

  if (error) throw new Error(`Error creando Meeting: ${error.message}`);
  return data;
}

async function updateMeetingStatus(id, status, notes = null) {
  const valid = ['scheduled', 'completed', 'no_show', 'cancelled'];
  if (!valid.includes(status)) throw new Error(`Status inválido: ${status}`);

  const update = { status, updated_at: new Date().toISOString() };
  if (notes !== null) update.notes = notes;

  const { data, error } = await supabase
    .from('meetings')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error actualizando Meeting: ${error.message}`);
  return data;
}

async function getMeetingsByLead(leadId) {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('lead_id', leadId)
    .order('scheduled_at', { ascending: false });

  if (error) throw new Error(`Error obteniendo Meetings: ${error.message}`);
  return data;
}

async function getAllMeetings() {
  const { data, error } = await supabase
    .from('meetings')
    .select('*, leads(name, email, contact, source)')
    .order('scheduled_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(`Error obteniendo Meetings: ${error.message}`);
  return data;
}

module.exports = { createMeeting, updateMeetingStatus, getMeetingsByLead, getAllMeetings };
