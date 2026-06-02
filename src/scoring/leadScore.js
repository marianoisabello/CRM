'use strict';

/**
 * Scoring determinístico de leads — Agente 01 (SDR).
 *
 * Devuelve:
 *   score          0-100
 *   classification 'hot' | 'warm' | 'cold' | 'unqualified'
 *   next_action    'schedule_meeting' | 'send_info' | 'nurture' | 'discard'
 *   reasons        string[] — explicación del score para el log
 */

const SOURCE_SCORES = {
  linkedin: 20,       // intención de negocio alta
  web_form: 15,       // buscó activamente
  email: 12,          // inbound, interés real
  manychat: 10,       // canal de bajo umbral
  whatsapp: 10,
  instagram: 8,
  database_import: 5, // leads fríos de base
};

function scoreLeadData(lead) {
  let score = 0;
  const reasons = [];

  // ── Fuente ───────────────────────────────────────────────────────────────
  const sourcePoints = SOURCE_SCORES[lead.source] || 5;
  score += sourcePoints;
  reasons.push(`fuente=${lead.source} (+${sourcePoints})`);

  // ── Datos de contacto ────────────────────────────────────────────────────
  if (lead.email) { score += 10; reasons.push('tiene email (+10)'); }
  if (lead.contact && lead.contact_type === 'phone') { score += 15; reasons.push('tiene teléfono (+15)'); }
  if (lead.name && lead.name.trim().split(' ').length >= 2) { score += 5; reasons.push('nombre completo (+5)'); }

  // ── Mensaje / intención ──────────────────────────────────────────────────
  if (lead.message) {
    const wordCount = lead.message.trim().split(/\s+/).length;
    if (wordCount >= 20) { score += 20; reasons.push(`mensaje largo (${wordCount} palabras, +20)`); }
    else if (wordCount >= 8) { score += 12; reasons.push(`mensaje medio (${wordCount} palabras, +12)`); }
    else if (wordCount >= 2) { score += 5; reasons.push(`mensaje corto (${wordCount} palabras, +5)`); }

    // Palabras de alta intención
    const highIntent = /presupuesto|precio|costo|contratar|cuánto|servicio|propuesta|reunión|llamada|urgente/i;
    if (highIntent.test(lead.message)) { score += 15; reasons.push('palabras de alta intención (+15)'); }
  }

  // ── Datos profesionales (LinkedIn) ───────────────────────────────────────
  if (lead.source === 'linkedin' && lead.message?.match(/en\s+\w+/)) {
    score += 5;
    reasons.push('datos de empresa disponibles (+5)');
  }

  // ── Cap a 100 ────────────────────────────────────────────────────────────
  score = Math.min(score, 100);

  // ── Clasificación ────────────────────────────────────────────────────────
  let classification;
  let next_action;

  if (score >= 65) {
    classification = 'hot';
    next_action = 'schedule_meeting';
  } else if (score >= 40) {
    classification = 'warm';
    next_action = 'send_info';
  } else if (score >= 15) {
    classification = 'cold';
    next_action = 'nurture';
  } else {
    classification = 'unqualified';
    next_action = 'discard';
  }

  return { score, classification, next_action, reasons };
}

module.exports = { scoreLeadData };
