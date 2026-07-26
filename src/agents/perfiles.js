/**
 * Agente 02 — Perfiles (Analista MVP)
 * Lee leads calificados de Supabase, enriquece con Claude, upsert en `perfiles`.
 */
'use strict';

const { callClaude } = require('../integrations/ai');
const supabase = require('../db/client');
const AgentRun = require('../lib/agentRun');
const logger = require('../lib/logger');

const SERVICIOS_DANA = [
  'Estrategia de marketing 360 — USD 1.500-2.500/mes',
  'Gestión de redes sociales — USD 800-1.200/mes',
  'Performance ads (Meta + Google) — USD 1.000-2.000/mes + spend',
  'SEO y contenidos — USD 700-1.200/mes',
  'Branding y rediseño — USD 2.500-5.000 one-shot',
];

const SYSTEM_PROMPT =
  'Sos un analista de marketing senior de Dana. Recibis datos de un lead y devolves JSON con perfil enriquecido. ' +
  'Inferí pain points, recomendá servicios del catálogo y estimá una oferta. Español Latam, sin promesas. ' +
  'CATALOGO: ' + SERVICIOS_DANA.join(' | ') + '. ' +
  'REGLAS: 1) Nunca prometas resultados. 2) oferta_estimada es un rango. 3) score_potencial 0-100. ' +
  'OUTPUT JSON estricto: {"cargo_inferido":"","tamanio_inferido":"","pain_points":[],"servicios":[],"oferta_estimada":"","score":0,"razones":""}';

function normalizeLead(row) {
  const raw = row.raw_payload && typeof row.raw_payload === 'object' ? row.raw_payload : {};
  return {
    id: row.id || null,
    email: String(row.email || '').toLowerCase().trim(),
    nombre: String(row.nombre_apellido || row.name || raw.nombre || '').trim(),
    empresa: String(row.empresa || raw.empresa || '').trim(),
    cargo: String(row.cargo || raw.cargo || '').trim(),
    rubro: String(row.rubro || raw.rubro || '').trim(),
    objetivo: String(row.objetivo_necesidad || row.message || raw.objetivo || '').trim(),
    telefono: String(row.whatsapp || row.contact || '').trim(),
    sitio_web: String(row.web_sitio || raw.sitio_web || '').trim(),
    ciudad: String(row.pais_ciudad || raw.ciudad || '').trim(),
    tamanio: String(row['tamaño_negocio'] || raw.tamanio || '').trim(),
    score: Number(row.score_total ?? row.score ?? 0) || 0,
    categoria: String(row.categoria_lead || row.classification || '').trim(),
    source: String(row.source || '').trim(),
  };
}

function isQualified(lead) {
  const c = (lead.categoria || '').toUpperCase();
  return (
    c === 'CALIENTE' ||
    c === 'TIBIO' ||
    c === 'HOT' ||
    c === 'WARM' ||
    lead.score >= 40
  );
}

function esReciente(updatedAt, dias) {
  if (!updatedAt) return false;
  const d = new Date(updatedAt);
  if (Number.isNaN(d.getTime())) return false;
  return (Date.now() - d.getTime()) / 86400000 < dias;
}

async function enrichOne(leadRow) {
  const lead = normalizeLead(leadRow);
  if (!lead.email) throw new Error('Lead sin email');

  const { text, tokensUsed } = await callClaude({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: 'Lead: ' + JSON.stringify(lead),
    maxTokens: 800,
    context: `perfiles.${lead.email}`,
  });

  let enriched = {};
  try {
    const m = text.match(/\{[\s\S]*\}/);
    enriched = m ? JSON.parse(m[0]) : {};
  } catch {
    enriched = {};
  }

  const perfil = {
    email: lead.email,
    nombre: lead.nombre,
    empresa: lead.empresa,
    cargo: lead.cargo || enriched.cargo_inferido || '',
    rubro: lead.rubro,
    tamanio_empresa: lead.tamanio || enriched.tamanio_inferido || '',
    sitio_web: lead.sitio_web || null,
    ciudad: lead.ciudad || null,
    telefono: lead.telefono || null,
    source: lead.source || null,
    sdr_score: lead.score,
    sdr_categoria: lead.categoria || null,
    lead_id: lead.id || null,
    pain_points_inferidos: enriched.pain_points || [],
    servicios_recomendados: enriched.servicios || [],
    oferta_estimada: enriched.oferta_estimada || '',
    score_potencial: Number(enriched.score) || 0,
    razones: enriched.razones || '',
    objetivo_original: lead.objetivo || '',
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('perfiles').upsert(perfil, { onConflict: 'email' });
  if (error) throw new Error(error.message);
  return { perfil, tokensUsed };
}

/**
 * Procesa leads calificados sin perfil fresco.
 */
async function processQualifiedLeads({ maxAgeDays = 30, limit = 40 } = {}) {
  const run = await AgentRun.start('perfiles', { inputData: { maxAgeDays, limit } });
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .not('email', 'is', null)
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);

    const { data: perfiles } = await supabase.from('perfiles').select('email, updated_at').limit(5000);
    const map = {};
    for (const p of perfiles || []) map[(p.email || '').toLowerCase()] = p;

    const candidates = (leads || [])
      .map(normalizeLead)
      .filter((l) => l.email && isQualified(l))
      .filter((l) => !esReciente(map[l.email]?.updated_at, maxAgeDays))
      .slice(0, limit);

    const result = { procesados: 0, saltados: (leads || []).length - candidates.length, errores: [] };
    let tokens = 0;

    for (const lead of candidates) {
      try {
        const row = (leads || []).find((r) => String(r.email || '').toLowerCase() === lead.email);
        const { tokensUsed } = await enrichOne(row || lead);
        tokens += tokensUsed || 0;
        result.procesados++;
      } catch (e) {
        result.errores.push({ email: lead.email, error: e.message });
        logger.error({ msg: 'Error enriqueciendo perfil', email: lead.email, error: e.message });
      }
    }

    await run.complete({ outputData: result, tokensUsed: tokens });
    return result;
  } catch (err) {
    await run.fail(err);
    throw err;
  }
}

module.exports = { enrichOne, processQualifiedLeads, normalizeLead };
