'use strict';

const supabase = require('./client');
const { findOrCreateCompanyByName } = require('./companies');

async function listContacts({ q, company_id, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('contacts')
    .select('*, companies(id, name)')
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (company_id) query = query.eq('company_id', company_id);
  if (q) {
    const safe = String(q).trim().replace(/[%*,()"\\]/g, '').slice(0, 80);
    if (safe) {
      const term = `"%${safe}%"`;
      query = query.or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(`Error listando contacts: ${error.message}`);
  return data || [];
}

async function getContact(id) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*, companies(id, name, website, industry), leads(id, name, email, status, score)')
    .eq('id', id)
    .single();
  if (error) throw new Error(`Error obteniendo contact: ${error.message}`);
  return data;
}

async function createContact(payload) {
  const row = {
    lead_id: payload.lead_id || null,
    company_id: payload.company_id || null,
    name: payload.name || null,
    email: payload.email ? String(payload.email).trim().toLowerCase() : null,
    phone: payload.phone || null,
    linkedin_url: payload.linkedin_url || null,
    role: payload.role || null,
    owner_id: payload.owner_id || null,
  };

  const { data, error } = await supabase.from('contacts').insert(row).select().single();
  if (error) throw new Error(`Error creando contact: ${error.message}`);
  return data;
}

async function updateContact(id, patch) {
  const allowed = ['lead_id', 'company_id', 'name', 'email', 'phone', 'linkedin_url', 'role', 'owner_id'];
  const row = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (patch[k] !== undefined) {
      row[k] = k === 'email' && patch[k] ? String(patch[k]).trim().toLowerCase() : patch[k];
    }
  }

  const { data, error } = await supabase
    .from('contacts')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Error actualizando contact: ${error.message}`);
  return data;
}

async function deleteContact(id) {
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw new Error(`Error eliminando contact: ${error.message}`);
  return true;
}

/**
 * Convierte un lead en contact (+ company opcional).
 * Idempotente si el lead ya tiene converted_contact_id o contact con lead_id.
 */
async function createContactFromLead(leadId, { createDeal = false, owner_id = null } = {}) {
  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();
  if (leadErr) throw new Error(`Lead no encontrado: ${leadErr.message}`);

  async function ensureDealForContact(contact, company) {
    if (!createDeal) return null;
    if (lead.converted_deal_id) {
      const { data } = await supabase.from('deals').select('*').eq('id', lead.converted_deal_id).maybeSingle();
      return data || null;
    }
    const { createDeal: createDealRow } = require('./deals');
    const deal = await createDealRow({
      title: lead.name ? `Oportunidad — ${lead.name}` : 'Nueva oportunidad',
      contact_id: contact.id,
      company_id: contact.company_id || company?.id || null,
      lead_id: leadId,
      owner_id,
      source: lead.source || null,
      stage: 'prospeccion',
      status: 'open',
      probability: 25,
    });
    await supabase
      .from('leads')
      .update({ converted_deal_id: deal.id, updated_at: new Date().toISOString() })
      .eq('id', leadId);
    return deal;
  }

  if (lead.converted_contact_id) {
    const existing = await getContact(lead.converted_contact_id);
    const deal = await ensureDealForContact(existing, existing.companies || null);
    return { contact: existing, company: existing.companies || null, created: false, deal };
  }

  const { data: byLead } = await supabase
    .from('contacts')
    .select('*')
    .eq('lead_id', leadId)
    .maybeSingle();
  if (byLead) {
    await supabase
      .from('leads')
      .update({
        converted_contact_id: byLead.id,
        company_id: byLead.company_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);
    const deal = await ensureDealForContact(byLead, null);
    return { contact: byLead, company: null, created: false, deal };
  }

  const companyName = lead.company_name || null;
  let company = null;
  if (companyName) {
    company = await findOrCreateCompanyByName(companyName, { owner_id });
  } else if (lead.company_id) {
    const { data } = await supabase.from('companies').select('*').eq('id', lead.company_id).maybeSingle();
    company = data;
  }

  const contact = await createContact({
    lead_id: leadId,
    company_id: company?.id || lead.company_id || null,
    name: lead.name || null,
    email: lead.email || null,
    phone: lead.contact_type === 'phone' ? lead.contact : null,
    linkedin_url: lead.linkedin_url || (lead.contact_type === 'linkedin_profile' ? lead.contact : null),
    owner_id,
  });

  const leadPatch = {
    converted_contact_id: contact.id,
    company_id: contact.company_id,
    company_name: companyName || lead.company_name || null,
    updated_at: new Date().toISOString(),
  };
  await supabase.from('leads').update(leadPatch).eq('id', leadId);

  const deal = await ensureDealForContact(contact, company);
  return { contact, company, created: true, deal };
}

module.exports = {
  listContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  createContactFromLead,
};
