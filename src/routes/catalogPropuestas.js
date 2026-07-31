'use strict';

const express = require('express');
const router = express.Router();
const supabase = require('../db/client');
const logger = require('../lib/logger');

function nowIso() {
  return new Date().toISOString();
}

function parseTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  return String(raw)
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** GET /api/propuestas?activo=true&q= */
router.get('/', async (req, res) => {
  const { activo, q, limit = 100, offset = 0 } = req.query;
  let query = supabase
    .from('propuestas')
    .select('*')
    .order('nombre', { ascending: true })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (activo === 'true') query = query.eq('activo', true);
  if (activo === 'false') query = query.eq('activo', false);
  if (q) {
    const safe = String(q).trim().replace(/[%*,()]/g, '').slice(0, 80);
    if (safe) query = query.ilike('nombre', `%${safe}%`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true, propuestas: data || [] });
});

/**
 * POST /api/propuestas/assign
 * Body: { email, propuesta_id, origen?: 'manual'|'auto', notas?, lead_id? }
 */
router.post('/assign', async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || '').toLowerCase().trim();
  const propuestaId = body.propuesta_id;
  if (!email) return res.status(400).json({ ok: false, error: 'email requerido' });
  if (!propuestaId) return res.status(400).json({ ok: false, error: 'propuesta_id requerido' });

  const origen = body.origen === 'auto' ? 'auto' : 'manual';
  const notas = body.notas != null ? String(body.notas) : null;
  const leadId = body.lead_id || null;
  let dealId = body.deal_id || null;
  const ts = nowIso();

  const { data: prop, error: propErr } = await supabase
    .from('propuestas')
    .select('id, nombre, activo')
    .eq('id', propuestaId)
    .maybeSingle();
  if (propErr) return res.status(500).json({ ok: false, error: propErr.message });
  if (!prop) return res.status(404).json({ ok: false, error: 'Propuesta no encontrada' });

  const { data: perfil, error: perfilErr } = await supabase
    .from('perfiles')
    .update({
      propuesta_id: propuestaId,
      propuesta_origen: origen,
      propuesta_notas: notas,
      propuesta_asignada_at: ts,
      updated_at: ts,
    })
    .eq('email', email)
    .select(
      'email, nombre, lead_id, company_id, propuesta_id, propuesta_origen, propuesta_notas, propuesta_asignada_at'
    )
    .maybeSingle();
  if (perfilErr) return res.status(500).json({ ok: false, error: perfilErr.message });
  if (!perfil) {
    return res.status(404).json({
      ok: false,
      error: 'Perfil no encontrado. Enriquecé el lead antes de asignar propuesta.',
    });
  }

  const resolvedLeadId = leadId || perfil.lead_id || null;
  if (!dealId && resolvedLeadId) {
    const { data: leadRow } = await supabase
      .from('leads')
      .select('converted_deal_id')
      .eq('id', resolvedLeadId)
      .maybeSingle();
    dealId = leadRow?.converted_deal_id || null;
  }

  const { error: junErr } = await supabase.from('lead_propuestas').upsert(
    {
      email,
      lead_id: resolvedLeadId,
      deal_id: dealId,
      propuesta_id: propuestaId,
      origen,
      notas,
      updated_at: ts,
    },
    { onConflict: 'email,propuesta_id' }
  );
  if (junErr) {
    logger.error({ msg: 'lead_propuestas upsert falló', error: junErr.message, email });
  }

  return res.json({
    ok: true,
    perfil,
    propuesta: prop,
    message: `Propuesta "${prop.nombre}" asignada a ${email}`,
  });
});

/** DELETE /api/propuestas/assign  Body: { email, propuesta_id? } */
router.delete('/assign', async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ ok: false, error: 'email requerido' });
  const propuestaId = body.propuesta_id || null;
  const ts = nowIso();

  if (propuestaId) {
    await supabase.from('lead_propuestas').delete().eq('email', email).eq('propuesta_id', propuestaId);
  }

  const { data: current } = await supabase
    .from('perfiles')
    .select('propuesta_id')
    .eq('email', email)
    .maybeSingle();

  if (!propuestaId || (current && current.propuesta_id === propuestaId)) {
    const { error } = await supabase
      .from('perfiles')
      .update({
        propuesta_id: null,
        propuesta_origen: null,
        propuesta_notas: null,
        propuesta_asignada_at: null,
        updated_at: ts,
      })
      .eq('email', email);
    if (error) return res.status(500).json({ ok: false, error: error.message });
  }

  return res.json({ ok: true, cleared: true });
});

/** GET /api/propuestas/by-lead/:email */
router.get('/by-lead/:email', async (req, res) => {
  const email = String(req.params.email || '').toLowerCase().trim();
  const { data: perfil, error } = await supabase
    .from('perfiles')
    .select(
      'email, propuesta_id, propuesta_origen, propuesta_notas, propuesta_asignada_at, oferta_estimada, servicios_recomendados'
    )
    .eq('email', email)
    .maybeSingle();
  if (error) return res.status(500).json({ ok: false, error: error.message });

  let propuesta = null;
  if (perfil?.propuesta_id) {
    const { data } = await supabase
      .from('propuestas')
      .select('*')
      .eq('id', perfil.propuesta_id)
      .maybeSingle();
    propuesta = data;
  }

  const { data: historial } = await supabase
    .from('lead_propuestas')
    .select('*, propuestas(*)')
    .eq('email', email)
    .order('updated_at', { ascending: false });

  return res.json({
    ok: true,
    perfil: perfil || null,
    propuesta,
    historial: historial || [],
  });
});

/** GET /api/propuestas/:id */
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('propuestas')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  if (!data) return res.status(404).json({ ok: false, error: 'Propuesta no encontrada' });
  return res.json({ ok: true, propuesta: data });
});

/** POST /api/propuestas */
router.post('/', async (req, res) => {
  const body = req.body || {};
  const nombre = String(body.nombre || '').trim();
  if (!nombre) return res.status(400).json({ ok: false, error: 'nombre requerido' });

  const row = {
    nombre,
    descripcion: body.descripcion != null ? String(body.descripcion) : null,
    precio_min: body.precio_min != null && body.precio_min !== '' ? Number(body.precio_min) : null,
    precio_max: body.precio_max != null && body.precio_max !== '' ? Number(body.precio_max) : null,
    moneda: String(body.moneda || 'USD').trim() || 'USD',
    tags: Array.isArray(body.tags) ? body.tags : parseTags(body.tags),
    rubros: Array.isArray(body.rubros) ? body.rubros : parseTags(body.rubros),
    activo: body.activo !== false && body.activo !== 'false',
    updated_at: nowIso(),
  };

  const { data, error } = await supabase.from('propuestas').insert(row).select('*').single();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  logger.info({ msg: 'Propuesta creada', id: data.id, nombre: data.nombre });
  return res.status(201).json({ ok: true, propuesta: data });
});

/** PATCH /api/propuestas/:id */
router.patch('/:id', async (req, res) => {
  const body = req.body || {};
  const patch = { updated_at: nowIso() };
  if (body.nombre != null) patch.nombre = String(body.nombre).trim();
  if (body.descripcion != null) patch.descripcion = String(body.descripcion);
  if (body.precio_min !== undefined) {
    patch.precio_min = body.precio_min === '' || body.precio_min == null ? null : Number(body.precio_min);
  }
  if (body.precio_max !== undefined) {
    patch.precio_max = body.precio_max === '' || body.precio_max == null ? null : Number(body.precio_max);
  }
  if (body.moneda != null) patch.moneda = String(body.moneda).trim() || 'USD';
  if (body.tags !== undefined) patch.tags = Array.isArray(body.tags) ? body.tags : parseTags(body.tags);
  if (body.rubros !== undefined) patch.rubros = Array.isArray(body.rubros) ? body.rubros : parseTags(body.rubros);
  if (body.activo !== undefined) patch.activo = body.activo === true || body.activo === 'true';

  if (patch.nombre === '') return res.status(400).json({ ok: false, error: 'nombre no puede ser vacío' });

  const { data, error } = await supabase
    .from('propuestas')
    .update(patch)
    .eq('id', req.params.id)
    .select('*')
    .maybeSingle();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  if (!data) return res.status(404).json({ ok: false, error: 'Propuesta no encontrada' });
  return res.json({ ok: true, propuesta: data });
});

/** DELETE /api/propuestas/:id — soft-delete; ?hard=1 borra */
router.delete('/:id', async (req, res) => {
  if (req.query.hard === '1') {
    const { error } = await supabase.from('propuestas').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.json({ ok: true, deleted: true });
  }
  const { data, error } = await supabase
    .from('propuestas')
    .update({ activo: false, updated_at: nowIso() })
    .eq('id', req.params.id)
    .select('*')
    .maybeSingle();
  if (error) return res.status(500).json({ ok: false, error: error.message });
  if (!data) return res.status(404).json({ ok: false, error: 'Propuesta no encontrada' });
  return res.json({ ok: true, propuesta: data });
});

module.exports = router;
