'use strict';

/**
 * Normalizador para LinkedIn.
 * Fuentes posibles:
 *   - LinkedIn Lead Gen Forms (via Zapier/Make webhook)
 *   - Exportación manual de LinkedIn Sales Navigator
 *   - Webhook propio si se usa LinkedIn API
 *
 * Campos esperados (LinkedIn Lead Gen Form via Zapier/Make):
 * {
 *   "lead_id": "...",
 *   "first_name": "...",
 *   "last_name": "...",
 *   "email": "...",
 *   "phone": "...",
 *   "linkedin_profile": "...",
 *   "company": "...",
 *   "job_title": "...",
 *   "message": "..."
 * }
 */
function normalize(payload) {
  const firstName = payload.first_name || '';
  const lastName = payload.last_name || '';
  const name = (firstName + ' ' + lastName).trim() || payload.name || null;

  const email = payload.email || null;
  const phone = payload.phone || null;
  const linkedinProfile = payload.linkedin_profile || payload.linkedin_url || null;

  // Armar un message con datos de contexto profesional si están disponibles
  let message = payload.message || null;
  const company = payload.company || payload.company_name || null;
  const jobTitle = payload.job_title || payload.title || null;
  if ((company || jobTitle) && !message) {
    message = [jobTitle, company].filter(Boolean).join(' en ');
  }

  return {
    source: 'linkedin',
    external_id: payload.lead_id ? String(payload.lead_id) : null,
    name,
    email,
    contact: linkedinProfile || phone || email,
    contact_type: linkedinProfile ? 'linkedin_profile' : phone ? 'phone' : 'email',
    message,
    raw_payload: payload,
  };
}

module.exports = { normalize };
