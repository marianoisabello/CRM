'use strict';

const config = require('../config');
const logger = require('../lib/logger');
const { withRetry } = require('../lib/retry');

/**
 * Integración de calendario — soporta Calendly y Google Calendar.
 * Activa el proveedor según CALENDAR_PROVIDER en .env.
 */

// ─── Calendly ─────────────────────────────────────────────────────────────────

async function getCalendlySchedulingLink(leadData) {
  if (!config.calendar.calendlyToken) {
    logger.warn('Calendly token no configurado, devolviendo link genérico');
    return null;
  }

  return withRetry(
    async () => {
      const res = await fetch('https://api.calendly.com/scheduling_links', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.calendar.calendlyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          max_event_count: 1,
          owner: leadData.calendlyEventUrl || process.env.CALENDLY_EVENT_URL,
          owner_type: 'EventType',
        }),
      });

      if (!res.ok) throw new Error(`Calendly error: ${res.status}`);
      const data = await res.json();
      return data.resource?.booking_url || null;
    },
    { retries: 3, context: 'calendar.calendly' }
  );
}

// ─── Google Calendar ───────────────────────────────────────────────────────────

async function createGoogleCalendarEvent({ summary, description, startTime, endTime, attendeeEmail }) {
  // Implementar con Google Calendar API cuando se active ese proveedor
  logger.warn({ msg: 'Google Calendar no implementado aún, usar Calendly', summary });
  return null;
}

// ─── Interfaz pública ─────────────────────────────────────────────────────────

async function getSchedulingLink(leadData) {
  if (config.calendar.provider === 'google') {
    return createGoogleCalendarEvent(leadData);
  }
  return getCalendlySchedulingLink(leadData);
}

module.exports = { getSchedulingLink };
