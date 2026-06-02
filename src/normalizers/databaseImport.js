'use strict';

/**
 * Normalizador para importación desde bases de datos existentes.
 * Fuentes posibles:
 *   - Exportación CSV/Excel subida al sistema
 *   - Migración desde otro CRM (HubSpot, Salesforce, Notion, Airtable, etc.)
 *   - Importación batch vía script
 *
 * Este normalizador es el más permisivo: acepta el mayor abanico de campos
 * y hace su mejor esfuerzo para mapearlos.
 *
 * Campos esperados (el que corresponda a la fuente):
 * {
 *   "id": "...",           // id original en la BD de origen
 *   "name": "...",         // o first_name + last_name
 *   "email": "...",
 *   "phone": "...",
 *   "whatsapp": "...",
 *   "instagram": "...",
 *   "linkedin": "...",
 *   "message": "...",      // nota o primer contacto
 *   "status": "...",       // si ya tiene un estado en el sistema de origen
 *   "source_system": "hubspot" // CRM de origen, para trazabilidad
 * }
 */
function normalize(payload) {
  const firstName = payload.first_name || '';
  const lastName = payload.last_name || '';
  const name = payload.name || (firstName + ' ' + lastName).trim() || null;

  const email = payload.email || payload.email_address || null;
  const phone = payload.phone || payload.phone_number || payload.whatsapp || null;
  const instagram = payload.instagram || payload.instagram_handle || null;
  const linkedin = payload.linkedin || payload.linkedin_url || payload.linkedin_profile || null;

  // Determinar contact principal en orden de preferencia
  let contact = null;
  let contactType = null;

  if (phone) {
    contact = phone;
    contactType = 'phone';
  } else if (email) {
    contact = email;
    contactType = 'email';
  } else if (instagram) {
    contact = instagram;
    contactType = 'instagram_handle';
  } else if (linkedin) {
    contact = linkedin;
    contactType = 'linkedin_profile';
  }

  // Mapear status si viene del sistema origen
  const statusMap = {
    new: 'new',
    nuevo: 'new',
    contacted: 'contacted',
    contactado: 'contacted',
    qualified: 'qualified',
    calificado: 'qualified',
    lost: 'lost',
    perdido: 'lost',
    won: 'won',
    ganado: 'won',
    cerrado: 'won',
    closed: 'won',
  };
  const rawStatus = (payload.status || '').toLowerCase();
  const status = statusMap[rawStatus] || 'new';

  // Enriquecer el external_id con el sistema de origen para evitar colisiones
  const sourceSystem = payload.source_system || 'unknown';
  const originalId = payload.id || payload.external_id || null;
  const externalId = originalId ? `${sourceSystem}:${originalId}` : null;

  return {
    source: 'database_import',
    external_id: externalId,
    name,
    email,
    contact,
    contact_type: contactType,
    message: payload.message || payload.notes || payload.note || null,
    status,
    raw_payload: payload,
  };
}

module.exports = { normalize };
