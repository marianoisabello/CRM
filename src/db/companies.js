'use strict';

const supabase = require('./client');

async function listCompanies({ q, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (q) {
    const safe = String(q).trim().replace(/[%*,()"\\]/g, '').slice(0, 80);
    if (safe) query = query.ilike('name', `%${safe}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Error listando companies: ${error.message}`);
  return data || [];
}

async function getCompany(id) {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Error obteniendo company: ${error.message}`);
  return data;
}

async function createCompany(payload) {
  const row = {
    name: payload.name,
    industry: payload.industry || null,
    size: payload.size || null,
    website: payload.website || null,
    city: payload.city || null,
    owner_id: payload.owner_id || null,
    notes: payload.notes || null,
  };
  if (!row.name || !String(row.name).trim()) {
    throw new Error('name es requerido');
  }

  const { data, error } = await supabase.from('companies').insert(row).select().single();
  if (error) throw new Error(`Error creando company: ${error.message}`);
  return data;
}

async function updateCompany(id, patch) {
  const allowed = ['name', 'industry', 'size', 'website', 'city', 'owner_id', 'notes'];
  const row = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (patch[k] !== undefined) row[k] = patch[k];
  }

  const { data, error } = await supabase
    .from('companies')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Error actualizando company: ${error.message}`);
  return data;
}

async function deleteCompany(id) {
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) throw new Error(`Error eliminando company: ${error.message}`);
  return true;
}

/** Busca por nombre (case-insensitive) o crea. */
async function findOrCreateCompanyByName(name, extras = {}) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;

  const { data: existing, error: findErr } = await supabase
    .from('companies')
    .select('*')
    .ilike('name', trimmed)
    .limit(1)
    .maybeSingle();

  if (findErr) throw new Error(`Error buscando company: ${findErr.message}`);
  if (existing) return existing;

  return createCompany({ name: trimmed, ...extras });
}

async function listCompanyContacts(companyId) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Error listando contacts de company: ${error.message}`);
  return data || [];
}

async function listCompanyDeals(companyId) {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Error listando deals de company: ${error.message}`);
  return data || [];
}

async function listCompanyClients(companyId) {
  const { data, error } = await supabase
    .from('clients')
    .select('*, leads(name, email, contact)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Error listando clients de company: ${error.message}`);
  return data || [];
}

module.exports = {
  listCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  findOrCreateCompanyByName,
  listCompanyContacts,
  listCompanyDeals,
  listCompanyClients,
};
