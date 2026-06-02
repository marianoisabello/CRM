'use strict';

/**
 * Normalizador para formularios web (Tally, Typeform, o formulario propio).
 * Campos esperados: name, email, message, phone (opcional).
 */
function normalize(payload) {
  const name = payload.name || payload.full_name || null;
  const email = payload.email || payload.email_address || null;
  const phone = payload.phone || payload.phone_number || null;
  const message = payload.message || payload.body || payload.text || null;

  // Derivar external_id si el formulario lo provee (ej: Tally usa responseId)
  const externalId =
    payload.responseId ||
    payload.response_id ||
    payload.submission_id ||
    null;

  return {
    source: 'web_form',
    external_id: externalId,
    name,
    email,
    contact: phone || email,
    contact_type: phone ? 'phone' : email ? 'email' : null,
    message,
    raw_payload: payload,
  };
}

module.exports = { normalize };
