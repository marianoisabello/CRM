'use strict';

/**
 * Normalizador para Instagram Graph API.
 * Webhook format: https://developers.facebook.com/docs/instagram-api/webhooks
 */
function normalize(payload) {
  const entry = payload.entry?.[0];
  const messaging = entry?.messaging?.[0];

  if (!messaging) {
    throw new Error('Payload de Instagram no contiene messaging');
  }

  const senderId = messaging.sender?.id;
  const messageText = messaging.message?.text || null;
  const externalId = messaging.message?.mid;

  return {
    source: 'instagram',
    external_id: externalId,
    name: null, // se obtiene por separado via Graph API
    email: null,
    contact: senderId,
    contact_type: 'instagram_handle',
    message: messageText,
    raw_payload: payload,
  };
}

module.exports = { normalize };
