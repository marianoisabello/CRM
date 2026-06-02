'use strict';

/**
 * Normalizador para WhatsApp Cloud API (Meta).
 * Webhook format: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
 */
function normalize(payload) {
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];
  const contact = value?.contacts?.[0];

  if (!message) {
    throw new Error('Payload de WhatsApp no contiene messages');
  }

  const phone = message.from;
  const name = contact?.profile?.name || null;
  const externalId = message.id;

  let text = null;
  if (message.type === 'text') text = message.text?.body || null;
  else if (message.type === 'button') text = message.button?.text || null;
  else if (message.type === 'interactive') {
    text =
      message.interactive?.list_reply?.title ||
      message.interactive?.button_reply?.title ||
      null;
  }

  return {
    source: 'whatsapp',
    external_id: externalId,
    name,
    email: null,
    contact: phone,
    contact_type: 'phone',
    message: text,
    raw_payload: payload,
  };
}

module.exports = { normalize };
