'use strict';

/**
 * Normalizador para ManyChat (External Request action).
 * Body esperado desde ManyChat:
 * {
 *   "external_id": "{{user_id}}",
 *   "name": "{{first_name}} {{last_name}}",
 *   "contact": "{{phone}}",
 *   "contact_type": "phone",
 *   "channel": "whatsapp_or_instagram",
 *   "message": "{{last_input_text}}"
 * }
 */
function normalize(payload) {
  return {
    source: 'manychat',
    external_id: payload.external_id ? String(payload.external_id) : null,
    name: payload.name || null,
    email: payload.email || null,
    contact: payload.contact || payload.phone || null,
    contact_type: payload.contact_type || (payload.phone ? 'phone' : null),
    message: payload.message || payload.last_input || null,
    raw_payload: payload,
  };
}

module.exports = { normalize };
