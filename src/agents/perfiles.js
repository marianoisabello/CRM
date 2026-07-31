/**
 * Agente 02 — Perfiles (Analista MVP)
 * Lee leads calificados de Supabase, research (scrape+search), enriquece con Claude, upsert en `perfiles`.
 *
 * Research SOURCE OF TRUTH: ../lib/research.js
 * Catálogo de servicios: tabla `propuestas` (fallback SERVICIOS_DANA hardcode).
 */
'use strict';

const { callClaude } = require('../integrations/ai');
const { researchLead } = require('../lib/research');
const supabase = require('../db/client');
const AgentRun = require('../lib/agentRun');
const logger = require('../lib/logger');

const SERVICIOS_DANA_FALLBACK = [
  'Estrategia de marketing 360 — USD 1.500-2.500/mes',
  'Gestión de redes sociales — USD 800-1.200/mes',
  'Performance ads (Meta + Google) — USD 1.000-2.000/mes + spend',
  'SEO y contenidos — USD 700-1.200/mes',
  'Branding y rediseño — USD 2.500-5.000 one-shot',
];

async function loadCatalogLines() {
  try {
    const { data, error } = await supabase
      .from('propuestas')
      .select('nombre, descripcion, precio_min, precio_max, moneda')
      .eq('activo', true)
      .order('nombre');
    if (error || !data?.length) return SERVICIOS_DANA_FALLBACK;
    return data.map((p) => {
      const rango =
        p.precio_min != null || p.precio_max != null
          ? ` — ${p.moneda || 'USD'} ${p.precio_min ?? '?'}-${p.precio_max ?? '?'}`
          : '';
      return `${p.nombre}${rango}${p.descripcion ? ` (${p.descripcion})` : ''}`;
    });
  } catch {
    return SERVICIOS_DANA_FALLBACK;
  }
}

function buildSystemPrompt(catalogLines) {
  return (
    'Sos un analista de marketing senior de Dana. Recibis datos de un lead y contexto de research (sitio web y/o búsqueda). ' +
    'Devolves JSON con perfil enriquecido. Inferí pain points, recomendá servicios del catálogo y estimá una oferta. Español Latam, sin promesas. ' +
    'CATALOGO: ' +
    catalogLines.join(' | ') +
    '. ' +
    'REGLAS: 1) Nunca prometas resultados. 2) oferta_estimada es un rango. 3) score_potencial 0-100. ' +
    '4) Si el research dice que el sitio o la búsqueda falló, NO inventes que lo visitaste ni cites resultados inexistentes. ' +
    'OUTPUT JSON estricto: {"cargo_inferido":"","tamanio_inferido":"","pain_points":[],"servicios":[],"oferta_estimada":"","score":0,"razones":""}'
  );
}

function normalizeLead(row) {
  const raw = row.raw_payload && typeof row.raw_payload === 'object' ? row.raw_payload : {};
  return {
    id: row.id || null,
    email: String(row.email || '').toLowerCase().trim(),
    nombre: String(row.nombre_apellido || row.name || raw.nombre || '').trim(),
    empresa: String(row.company_name || row.empresa || raw.empresa || raw.company || '').trim(),
    company_id: row.company_id || null,
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
    converted_deal_id: row.converted_deal_id || null,
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

  let research = null;
  let researchSummary = '';
  try {
    const r = await researchLead(lead);
    research = r.research;
    researchSummary = r.summary;
  } catch (err) {
    logger.warn({ msg: 'Research falló', email: lead.email, error: err.message });
    researchSummary = 'Research no disponible. No inventes visitas ni resultados de búsqueda.';
    research = { error: err.message, researched_at: new Date().toISOString() };
  }

  const catalogLines = await loadCatalogLines();
  const systemPrompt = buildSystemPrompt(catalogLines);

  const userMessage =
    'Lead: ' +
    JSON.stringify(lead) +
    '\n\n--- RESEARCH ---\n' +
    researchSummary;

  const { text, tokensUsed } = await callClaude({
    systemPrompt,
    userMessage,
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

  // Preserve manual propuesta assignment if present
  const { data: existing } = await supabase
    .from('perfiles')
    .select('propuesta_id, propuesta_origen, propuesta_notas, propuesta_asignada_at, company_id')
    .eq('email', lead.email)
    .maybeSingle();

  let companyId = lead.company_id || existing?.company_id || null;
  if (!companyId && lead.empresa) {
    try {
      const { findOrCreateCompanyByName } = require('../db/companies');
      const company = await findOrCreateCompanyByName(lead.empresa);
      companyId = company?.id || null;
      if (companyId && lead.id && !lead.company_id) {
        await supabase
          .from('leads')
          .update({
            company_id: companyId,
            company_name: lead.empresa,
            updated_at: new Date().toISOString(),
          })
          .eq('id', lead.id);
      }
    } catch (err) {
      logger.warn({ msg: 'No se pudo linkear company en perfil', email: lead.email, error: err.message });
    }
  }

  const perfil = {
    email: lead.email,
    nombre: lead.nombre,
    empresa: lead.empresa,
    company_id: companyId,
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
    research_context: research || {},
    research_summary: researchSummary || null,
    updated_at: new Date().toISOString(),
  };

  if (existing?.propuesta_origen === 'manual' && existing.propuesta_id) {
    perfil.propuesta_id = existing.propuesta_id;
    perfil.propuesta_origen = existing.propuesta_origen;
    perfil.propuesta_notas = existing.propuesta_notas;
    perfil.propuesta_asignada_at = existing.propuesta_asignada_at;
  }

  const { error } = await supabase.from('perfiles').upsert(perfil, { onConflict: 'email' });
  if (error) throw new Error(error.message);

  try {
    const { createActivity } = require('../db/activities');
    await createActivity({
      type: 'agent',
      title: `Perfil enriquecido — ${lead.nombre || lead.email}`,
      body: enriched.razones || null,
      lead_id: lead.id || null,
      company_id: companyId,
      agent_id: 'perfiles',
    });
  } catch (_) {
    /* soft */
  }

  return { perfil, tokensUsed, research };
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

module.exports = { enrichOne, processQualifiedLeads, normalizeLead, loadCatalogLines };
