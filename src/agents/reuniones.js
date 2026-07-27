/**
 * Agente 03 — Análisis de Reuniones
 * Analiza transcript (manual / Zoom / Meet / WhatsApp) → insights en `reuniones`.
 */
'use strict';

const supabase = require('../db/client');
const AgentRun = require('../lib/agentRun');
const logger = require('../lib/logger');
const { callLlm, parseJsonLoose } = require('../integrations/llm');

const SYSTEM_PROMPT =
  'Sos un analista comercial senior de Dana (agencia de marketing LatAm). ' +
  'Analizás transcripciones de reuniones o chats con prospectos/clientes. ' +
  'Devolvé JSON estricto (sin markdown) con insights accionables en español LatAm. ' +
  'REGLAS: 1) No inventes hechos que no estén en el transcript. 2) Citas cortas cuando cites. ' +
  '3) score_cierre 0-100 (probabilidad de cerrar en 30 días). 4) nivel_interes solo ALTO|MEDIO|BAJO. ' +
  'OUTPUT JSON: {' +
  '"resumen":"string 2-4 oraciones",' +
  '"pain_points":["string"],' +
  '"objeciones":["string"],' +
  '"nivel_interes":"ALTO|MEDIO|BAJO",' +
  '"senales_compra":["string"],' +
  '"proximos_pasos":["string"],' +
  '"frases_destacadas":["string"],' +
  '"score_cierre":0,' +
  '"participantes":["string"],' +
  '"lead_email_inferido":"",' +
  '"lead_phone_inferido":""' +
  '}';

function truncateTranscript(text, maxChars = 24000) {
  const t = String(text || '').trim();
  if (t.length <= maxChars) return t;
  const head = Math.floor(maxChars * 0.55);
  const tail = maxChars - head - 80;
  return (
    t.slice(0, head) +
    '\n\n[... transcript truncado por longitud ...]\n\n' +
    t.slice(-tail)
  );
}

async function matchLead({ email, phone }) {
  if (email) {
    const { data } = await supabase
      .from('leads')
      .select('id, email, name, contact')
      .ilike('email', String(email).toLowerCase().trim())
      .limit(1);
    if (data?.[0]) return data[0];
  }
  if (phone) {
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length >= 8) {
      const { data } = await supabase
        .from('leads')
        .select('id, email, name, contact, whatsapp')
        .or(`contact.ilike.%${digits.slice(-8)}%,whatsapp.ilike.%${digits.slice(-8)}%`)
        .limit(1);
      if (data?.[0]) return data[0];
    }
  }
  return null;
}

function normalizeAnalysis(raw) {
  const nivel = String(raw.nivel_interes || '').toUpperCase();
  const nivelOk = ['ALTO', 'MEDIO', 'BAJO'].includes(nivel) ? nivel : 'MEDIO';
  let score = Number(raw.score_cierre);
  if (!Number.isFinite(score)) score = 0;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const arr = (v) => (Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, 20) : []);

  return {
    resumen: String(raw.resumen || '').slice(0, 4000),
    pain_points: arr(raw.pain_points),
    objeciones: arr(raw.objeciones),
    nivel_interes: nivelOk,
    senales_compra: arr(raw.senales_compra || raw.señales_compra),
    proximos_pasos: arr(raw.proximos_pasos),
    frases_destacadas: arr(raw.frases_destacadas),
    score_cierre: score,
    participantes: arr(raw.participantes),
    lead_email_inferido: String(raw.lead_email_inferido || '').toLowerCase().trim() || null,
    lead_phone_inferido: String(raw.lead_phone_inferido || '').trim() || null,
  };
}

/**
 * Create a pending reunión from ingest (manual / webhook).
 */
async function createPending(payload = {}) {
  const row = {
    fecha: payload.fecha || new Date().toISOString(),
    duracion_min: payload.duracion_min != null ? Number(payload.duracion_min) : null,
    participantes: payload.participantes || [],
    lead_email: payload.lead_email ? String(payload.lead_email).toLowerCase().trim() : null,
    lead_phone: payload.lead_phone || null,
    lead_id: payload.lead_id || null,
    titulo: payload.titulo || null,
    transcript: payload.transcript || null,
    transcript_url: payload.transcript_url || null,
    recording_url: payload.recording_url || null,
    source: payload.source || 'manual',
    external_id: payload.external_id || null,
    status: 'pending',
    raw_payload: payload.raw_payload || {},
    updated_at: new Date().toISOString(),
  };

  if (row.external_id) {
    const { data: existing } = await supabase
      .from('reuniones')
      .select('id, status')
      .eq('source', row.source)
      .eq('external_id', row.external_id)
      .maybeSingle();
    if (existing) {
      const { data, error } = await supabase
        .from('reuniones')
        .update({
          transcript: row.transcript || undefined,
          recording_url: row.recording_url || undefined,
          transcript_url: row.transcript_url || undefined,
          lead_email: row.lead_email || undefined,
          lead_phone: row.lead_phone || undefined,
          titulo: row.titulo || undefined,
          raw_payload: row.raw_payload,
          updated_at: row.updated_at,
          status: existing.status === 'done' ? existing.status : 'pending',
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }

  const { data, error } = await supabase.from('reuniones').insert(row).select().single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Analyze one reunión by id (or analyze inline transcript creating a row).
 */
async function analyzeReunion(reunionId, { force = false } = {}) {
  const { data: reunion, error } = await supabase
    .from('reuniones')
    .select('*')
    .eq('id', reunionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!reunion) throw new Error('Reunión no encontrada');
  if (!reunion.transcript || !String(reunion.transcript).trim()) {
    throw new Error('La reunión no tiene transcript para analizar');
  }
  if (reunion.status === 'done' && !force) {
    return { reunion, skipped: true };
  }

  const run = await AgentRun.start('reuniones', {
    inputData: { reunion_id: reunionId, source: reunion.source },
  });

  try {
    await supabase
      .from('reuniones')
      .update({ status: 'analyzing', error_message: null, updated_at: new Date().toISOString() })
      .eq('id', reunionId);

    const transcript = truncateTranscript(reunion.transcript);
    const userMessage =
      `Fuente: ${reunion.source || 'manual'}\n` +
      `Título: ${reunion.titulo || '—'}\n` +
      `Email hint: ${reunion.lead_email || '—'}\n` +
      `Tel hint: ${reunion.lead_phone || '—'}\n` +
      `Fecha: ${reunion.fecha || '—'}\n\n` +
      `--- TRANSCRIPT ---\n${transcript}`;

    const { text, tokensUsed, provider } = await callLlm({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      maxTokens: 1400,
      context: `reuniones.${reunionId}`,
    });

    const analysis = normalizeAnalysis(parseJsonLoose(text));
    const email = reunion.lead_email || analysis.lead_email_inferido;
    const phone = reunion.lead_phone || analysis.lead_phone_inferido;
    const lead = await matchLead({ email, phone });

    const update = {
      resumen: analysis.resumen,
      pain_points: analysis.pain_points,
      objeciones: analysis.objeciones,
      nivel_interes: analysis.nivel_interes,
      senales_compra: analysis.senales_compra,
      proximos_pasos: analysis.proximos_pasos,
      frases_destacadas: analysis.frases_destacadas,
      score_cierre: analysis.score_cierre,
      participantes:
        analysis.participantes?.length ? analysis.participantes : reunion.participantes || [],
      lead_email: email || reunion.lead_email || null,
      lead_phone: phone || reunion.lead_phone || null,
      lead_id: lead?.id || reunion.lead_id || null,
      status: 'done',
      error_message: null,
      updated_at: new Date().toISOString(),
      raw_payload: {
        ...(reunion.raw_payload || {}),
        llm_provider: provider,
        analyzed_at: new Date().toISOString(),
      },
    };

    const { data: updated, error: upErr } = await supabase
      .from('reuniones')
      .update(update)
      .eq('id', reunionId)
      .select()
      .single();
    if (upErr) throw new Error(upErr.message);

    await run.complete({
      outputData: { reunion_id: reunionId, score_cierre: update.score_cierre, nivel_interes: update.nivel_interes },
      tokensUsed,
    });

    return { reunion: updated, tokensUsed, provider };
  } catch (err) {
    await supabase
      .from('reuniones')
      .update({
        status: 'error',
        error_message: err.message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reunionId);
    await run.fail(err);
    throw err;
  }
}

/**
 * Process pending reuniones (for n8n / cron).
 */
async function processPending({ limit = 10 } = {}) {
  const { data, error } = await supabase
    .from('reuniones')
    .select('id')
    .eq('status', 'pending')
    .not('transcript', 'is', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  const results = { processed: 0, errors: 0, ids: [] };
  for (const row of data || []) {
    try {
      await analyzeReunion(row.id);
      results.processed += 1;
      results.ids.push(row.id);
    } catch (err) {
      results.errors += 1;
      logger.error({ msg: 'Error analizando reunión pending', id: row.id, error: err.message });
    }
  }
  return results;
}

module.exports = {
  createPending,
  analyzeReunion,
  processPending,
  matchLead,
  truncateTranscript,
};
