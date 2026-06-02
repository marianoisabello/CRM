'use strict';

/**
 * Normalizador para emails inbound.
 * Fuentes posibles:
 *   - Mailgun / SendGrid / Postmark inbound parsing (webhook)
 *   - Gmail via Zapier/Make
 *   - Forward a webhook propio
 *
 * Campos esperados (formato estándar de inbound email parsing):
 * {
 *   "message_id": "<id@mail.example.com>",
 *   "from": "Juan Pérez <juan@ejemplo.com>",
 *   "from_email": "juan@ejemplo.com",
 *   "from_name": "Juan Pérez",
 *   "subject": "Consulta sobre el servicio",
 *   "body_plain": "Hola, me gustaría...",
 *   "body_html": "<p>Hola...</p>",
 *   "to": "contacto@tuempresa.com",
 *   "date": "2026-06-02T10:00:00Z"
 * }
 */
function normalize(payload) {
  // Parsear "Nombre <email>" si viene junto
  let name = payload.from_name || null;
  let email = payload.from_email || null;

  if (!email && payload.from) {
    const match = payload.from.match(/^(.*?)\s*<([^>]+)>/);
    if (match) {
      name = name || match[1].trim() || null;
      email = match[2].trim();
    } else if (payload.from.includes('@')) {
      email = payload.from.trim();
    }
  }

  // Preferir texto plano; truncar si es muy largo para el campo message
  const body = payload.body_plain || payload.body_text || payload.body_html || null;
  const subject = payload.subject || null;
  const message = subject
    ? `[${subject}] ${body || ''}`.trim()
    : body;

  return {
    source: 'email',
    external_id: payload.message_id ? String(payload.message_id) : null,
    name,
    email,
    contact: email,
    contact_type: 'email',
    message: message ? message.substring(0, 2000) : null,
    raw_payload: payload,
  };
}

module.exports = { normalize };
