/**
 * Agente 04 — Briefing Automático
 * Cruza lead + perfil + última reunión + catálogo propuestas → briefing comercial en `briefings`.
 * MVP: JSON/markdown en DB (Google Doc = v2).
 */
'use strict';

const supabase = require('../db/client');
const AgentRun = require('../lib/agentRun');
const logger = require('../lib/logger');
const { callLlm, parseJsonLoose } = require('../integrations/llm');

const SERVICIOS_DANA_FALLBACK = [
  {
    id: null,
    nombre: 'Estrategia de marketing 360',
    descripcion: 'Plan integral de marketing',
    precio_min: 1500,
    precio_max: 2500,
    moneda: 'USD',
  },
  {
    id: null,
    nombre: 'Gestión de redes sociales',
    descripcion: 'Contenido y community',
    precio_min: 800,
    precio_max: 1200,
    moneda: 'USD',
  },
  {
    id: null,
    nombre: 'Performance ads (Meta + Google)',
    descripcion: 'Campañas performance. Fee + spend aparte.',
    precio_min: 1000,
    precio_max: 2000,
    moneda: 'USD',
  },
  {
    id: null,
    nombre: 'SEO y contenidos',
    descripcion: 'SEO on-page y contenidos',
    precio_min: 700,
    precio_max: 1200,
    moneda: 'USD',
  },
  {
    id: null,
    nombre: 'Branding y rediseño',
    descripcion: 'Identidad visual. One-shot.',
    precio_min: 2500,
    precio_max: 5000,
    moneda: 'USD',
  },
];

const SYSTEM_PROMPT =
  'Sos un estratega comercial senior de Dana (agencia de marketing LatAm). ' +
  'Generás briefings comerciales listos para revisión humana antes de enviar al cliente. ' +
  'Devolvé JSON estricto (sin markdown fuera del campo brief_markdown). Español LatAm. ' +
  'REGLAS: 1) Precios SIEMPRE como rango desde el catálogo (no inventes precios). ' +
  '2) No prometas resultados garantizados. 3) Si falta perfil o reunión, marcá gaps en riesgos. ' +
  '4) Elegí 2-5 servicios del catálogo que mejor encajen. ' +
  'OUTPUT JSON: {' +
  '"objetivo_cliente":"string",' +
  '"servicios_sugeridos":["nombre exacto del catálogo"],' +
  '"propuesta_principal":"nombre del servicio principal o null",' +
  '"presupuesto_estimado":"USD X-Y/mes o rango",' +
  '"plazo":"string ej. 3 meses + iteración",' +
  '"kpis":["string medible"],' +
  '"riesgos_detectados":["string"],' +
  '"diferenciadores":["string"],' +
  '"resumen_ejecutivo":"2-4 oraciones",' +
  '"brief_markdown":"markdown completo del brief (secciones: Objetivo, Contexto, Servicios, Presupuesto, Plazo, KPIs, Riesgos, Diferenciadores, Próximos pasos)"' +
  '}';

function arr(v, max = 20) {
  return Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, max) : [];
}

function normalizeBrief(raw) {
  return {
    objetivo_cliente: String(raw.objetivo_cliente || '').slice(0, 2000),
    servicios_sugeridos: arr(raw.servicios_sugeridos || raw.servicios_propuestos, 10),
    propuesta_principal: String(raw.propuesta_principal || '').trim() || null,
    presupuesto_estimado: String(raw.presupuesto_estimado || '').slice(0, 500),
    plazo: String(raw.plazo || raw.plazo_propuesto || '').slice(0, 500),
    kpis: arr(raw.kpis || raw.KPIs_principales, 15),
    riesgos_detectados: arr(raw.riesgos_detectados, 15),
    diferenciadores: arr(raw.diferenciadores || raw.diferenciadores_a_resaltar, 15),
    resumen_ejecutivo: String(raw.resumen_ejecutivo || '').slice(0, 4000),
    brief_markdown: String(raw.brief_markdown || '').slice(0, 50000),
  };
}

async function loadCatalog() {
  try {
    const { data, error } = await supabase
      .from('propuestas')
      .select('id, nombre, descripcion, precio_min, precio_max, moneda, tags, rubros')
      .eq('activo', true)
      .order('nombre');
    if (error || !data?.length) return SERVICIOS_DANA_FALLBACK;
    return data;
  } catch {
    return SERVICIOS_DANA_FALLBACK;
  }
}

function catalogLines(catalog) {
  return catalog.map((p) => {
    const rango =
      p.precio_min != null || p.precio_max != null
        ? ` — ${p.moneda || 'USD'} ${p.precio_min ?? '?'}-${p.precio_max ?? '?'}`
        : '';
    return `${p.nombre}${rango}${p.descripcion ? ` (${p.descripcion})` : ''}`;
  });
}

async function loadLead({ email, leadId }) {
  if (leadId) {
    const { data, error } = await supabase.from('leads').select('*').eq('id', leadId).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data;
  }
  if (email) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .ilike('email', String(email).toLowerCase().trim())
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    return data?.[0] || null;
  }
  return null;
}

async function loadPerfil(email) {
  if (!email) return null;
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('email', String(email).toLowerCase().trim())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

async function loadLatestReunion(email) {
  if (!email) return null;
  const { data, error } = await supabase
    .from('reuniones')
    .select('*')
    .ilike('lead_email', String(email).toLowerCase().trim())
    .eq('status', 'done')
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) {
    // Table may not exist yet — soft fail
    logger.warn({ msg: 'No se pudo leer reuniones', error: error.message });
    return null;
  }
  return data?.[0] || null;
}

function leadContext(lead) {
  if (!lead) return null;
  const raw = lead.raw_payload && typeof lead.raw_payload === 'object' ? lead.raw_payload : {};
  return {
    id: lead.id,
    email: lead.email,
    name: lead.name || lead.nombre_apellido || raw.nombre || null,
    empresa: lead.company_name || lead.empresa || raw.empresa || null,
    company_id: lead.company_id || null,
    converted_deal_id: lead.converted_deal_id || null,
    converted_contact_id: lead.converted_contact_id || null,
    message: lead.message || lead.objetivo_necesidad || null,
    score: lead.score ?? lead.score_total ?? null,
    classification: lead.classification || lead.categoria_lead || null,
    status: lead.status || null,
    source: lead.source || null,
    next_action: lead.next_action || null,
  };
}

function resolvePropuestaId(brief, catalog, perfil) {
  if (perfil?.propuesta_id) return perfil.propuesta_id;
  const name = brief.propuesta_principal || brief.servicios_sugeridos?.[0];
  if (!name) return null;
  const hit = catalog.find(
    (p) => p.id && String(p.nombre).toLowerCase() === String(name).toLowerCase()
  );
  return hit?.id || null;
}

/**
 * Generate briefing for a lead (by email or lead_id).
 */
async function generateBriefing({ email, leadId, force = false } = {}) {
  const lead = await loadLead({ email, leadId });
  const leadEmail = String(
    lead?.email || email || ''
  )
    .toLowerCase()
    .trim();
  if (!leadEmail) throw new Error('email o lead_id con email requerido');

  const [perfil, reunion, catalog] = await Promise.all([
    loadPerfil(leadEmail),
    loadLatestReunion(leadEmail),
    loadCatalog(),
  ]);

  // Version bump if previous DRAFT exists
  let version = 1;
  const { data: prev } = await supabase
    .from('briefings')
    .select('id, version, status')
    .eq('lead_email', leadEmail)
    .order('version', { ascending: false })
    .limit(1);
  if (prev?.[0]) {
    version = (Number(prev[0].version) || 1) + (force || prev[0].status !== 'DRAFT' ? 1 : 0);
    if (!force && prev[0].status === 'DRAFT') {
      // Update existing DRAFT in place
      version = Number(prev[0].version) || 1;
    }
  }

  const dealId = lead?.converted_deal_id || null;
  const run = await AgentRun.start('briefing', {
    leadId: lead?.id || null,
    dealId,
    inputData: { lead_email: leadEmail, reunion_id: reunion?.id || null, has_perfil: Boolean(perfil), deal_id: dealId },
  });

  try {
    const userMessage =
      'CATALOGO DE SERVICIOS:\n' +
      catalogLines(catalog).join('\n') +
      '\n\nLEAD:\n' +
      JSON.stringify(leadContext(lead) || { email: leadEmail }, null, 2) +
      '\n\nPERFIL (Agente 02):\n' +
      JSON.stringify(
        perfil
          ? {
              email: perfil.email,
              nombre: perfil.nombre,
              empresa: perfil.empresa,
              cargo: perfil.cargo,
              rubro: perfil.rubro,
              pain_points_inferidos: perfil.pain_points_inferidos,
              servicios_recomendados: perfil.servicios_recomendados,
              oferta_estimada: perfil.oferta_estimada,
              score_potencial: perfil.score_potencial,
              objetivo_original: perfil.objetivo_original,
              research_summary: perfil.research_summary,
              propuesta_id: perfil.propuesta_id,
            }
          : { nota: 'Sin perfil enriquecido aún — inferí con cuidado y listá gaps.' },
        null,
        2
      ) +
      '\n\nULTIMA REUNION (Agente 03):\n' +
      JSON.stringify(
        reunion
          ? {
              id: reunion.id,
              fecha: reunion.fecha,
              resumen: reunion.resumen,
              pain_points: reunion.pain_points,
              objeciones: reunion.objeciones,
              nivel_interes: reunion.nivel_interes,
              senales_compra: reunion.senales_compra,
              proximos_pasos: reunion.proximos_pasos,
              score_cierre: reunion.score_cierre,
            }
          : { nota: 'Sin reunión analizada — basate en lead + perfil.' },
        null,
        2
      );

    const { text, tokensUsed, provider } = await callLlm({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      maxTokens: 2200,
      context: `briefing.${leadEmail}`,
    });

    const brief = normalizeBrief(parseJsonLoose(text));
    const propuestaId = resolvePropuestaId(brief, catalog, perfil);

    const row = {
      lead_email: leadEmail,
      lead_id: lead?.id || null,
      deal_id: dealId,
      perfil_email: perfil?.email || null,
      reunion_id: reunion?.id || null,
      propuesta_id: propuestaId,
      objetivo_cliente: brief.objetivo_cliente || leadContext(lead)?.message || null,
      servicios_sugeridos: brief.servicios_sugeridos,
      presupuesto_estimado: brief.presupuesto_estimado,
      plazo: brief.plazo,
      kpis: brief.kpis,
      riesgos_detectados: brief.riesgos_detectados,
      diferenciadores: brief.diferenciadores,
      resumen_ejecutivo: brief.resumen_ejecutivo,
      brief_markdown: brief.brief_markdown,
      brief_completo_url: null,
      version,
      status: 'DRAFT',
      error_message: null,
      raw_llm: {
        provider,
        propuesta_principal: brief.propuesta_principal,
        generated_at: new Date().toISOString(),
        has_perfil: Boolean(perfil),
        has_reunion: Boolean(reunion),
      },
      updated_at: new Date().toISOString(),
    };

    let saved;
    if (!force && prev?.[0]?.status === 'DRAFT') {
      const { data, error } = await supabase
        .from('briefings')
        .update(row)
        .eq('id', prev[0].id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      saved = data;
    } else {
      const { data, error } = await supabase.from('briefings').insert(row).select().single();
      if (error) throw new Error(error.message);
      saved = data;
    }

    await run.complete({
      outputData: {
        briefing_id: saved.id,
        lead_email: leadEmail,
        status: saved.status,
        servicios: brief.servicios_sugeridos,
        deal_id: dealId,
      },
      tokensUsed,
    });

    try {
      const { createDecision } = require('../db/agentDecisions');
      const { createActivity } = require('../db/activities');
      await createDecision({
        agent_id: 'briefing',
        decision_type: 'briefing_draft',
        title: `Briefing DRAFT — ${leadEmail}`,
        summary: brief.resumen_ejecutivo || null,
        payload: { briefing_id: saved.id, lead_id: lead?.id || null },
        lead_id: lead?.id || null,
        deal_id: dealId,
        company_id: lead?.company_id || null,
        agent_run_id: run.id,
      });
      await createActivity({
        type: 'agent',
        title: `Briefing generado v${version}`,
        body: brief.resumen_ejecutivo || null,
        lead_id: lead?.id || null,
        deal_id: dealId,
        company_id: lead?.company_id || null,
        agent_id: 'briefing',
        agent_run_id: run.id,
      });
    } catch (err) {
      logger.warn({ msg: 'Decision/activity briefing soft-fail', error: err.message });
    }

    return { briefing: saved, tokensUsed, provider };
  } catch (err) {
    await run.fail(err);
    // Persist error row if possible
    try {
      await supabase.from('briefings').insert({
        lead_email: leadEmail,
        lead_id: lead?.id || null,
        status: 'error',
        error_message: err.message,
        version,
        updated_at: new Date().toISOString(),
      });
    } catch (_) {
      /* ignore */
    }
    throw err;
  }
}

/**
 * Update briefing status: DRAFT | REVISADO | ENVIADO
 */
async function updateStatus(briefingId, status) {
  const ok = ['DRAFT', 'REVISADO', 'ENVIADO'];
  const s = String(status || '').toUpperCase();
  if (!ok.includes(s)) throw new Error('status inválido (DRAFT|REVISADO|ENVIADO)');

  const { data, error } = await supabase
    .from('briefings')
    .update({ status: s, updated_at: new Date().toISOString(), error_message: null })
    .eq('id', briefingId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Process interesados: qualified leads / hot-warm without recent briefing.
 * Also used by n8n hook.
 */
async function processInteresados({ limit = 10, maxAgeDays = 14 } = {}) {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, email, status, classification, score, created_at')
    .not('email', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  const interesados = (leads || []).filter((l) => {
    if (!l.email) return false;
    const st = String(l.status || '').toLowerCase();
    const cl = String(l.classification || '').toLowerCase();
    return (
      st === 'qualified' ||
      st === 'interesado' ||
      cl === 'hot' ||
      cl === 'warm' ||
      (Number(l.score) || 0) >= 50
    );
  });

  const results = { processed: 0, skipped: 0, errors: 0, ids: [] };
  const cutoff = Date.now() - maxAgeDays * 86400000;

  for (const lead of interesados.slice(0, limit * 3)) {
    if (results.processed >= limit) break;
    const email = String(lead.email).toLowerCase().trim();

    const { data: existing } = await supabase
      .from('briefings')
      .select('id, status, updated_at')
      .eq('lead_email', email)
      .order('updated_at', { ascending: false })
      .limit(1);

    const last = existing?.[0];
    if (last && last.status !== 'error') {
      const t = new Date(last.updated_at).getTime();
      if (!Number.isNaN(t) && t > cutoff) {
        results.skipped += 1;
        continue;
      }
    }

    try {
      const { briefing } = await generateBriefing({ email, leadId: lead.id, force: Boolean(last) });
      results.processed += 1;
      results.ids.push(briefing.id);
    } catch (err) {
      results.errors += 1;
      logger.error({ msg: 'Error briefing interesado', email, error: err.message });
    }
  }

  return results;
}

module.exports = {
  generateBriefing,
  updateStatus,
  processInteresados,
  loadCatalog,
  loadPerfil,
  loadLatestReunion,
};
