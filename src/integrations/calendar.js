'use strict';

const { google } = require('googleapis');
const config = require('../config');
const logger = require('../lib/logger');

const REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'http://localhost:3000/api/auth/google-callback';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    config.calendar.googleClientId,
    config.calendar.googleClientSecret,
    REDIRECT_URI
  );
}

function isConfigured() {
  return !!(
    config.calendar.googleClientId &&
    config.calendar.googleClientSecret &&
    config.calendar.googleRefreshToken
  );
}

/** URL para el flujo OAuth inicial (solo se usa una vez para obtener refresh_token) */
function getAuthUrl() {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
}

/** Intercambia el code de OAuth por tokens — devuelve { refresh_token, access_token } */
async function exchangeCode(code) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Crea un evento en Google Calendar con Google Meet.
 * @param {Object} opts
 * @param {string} opts.summary          - Título del evento
 * @param {string} [opts.description]    - Notas / descripción
 * @param {string} opts.startTime        - ISO 8601
 * @param {string} [opts.endTime]        - ISO 8601 (si no se provee se calcula desde durationMinutes)
 * @param {number} [opts.durationMinutes=30]
 * @param {string} [opts.attendeeEmail]  - Email del lead (recibe invitación)
 * @returns {{ eventId, eventUrl, meetUrl } | null}
 */
async function createEvent({ summary, description, startTime, endTime, durationMinutes = 30, attendeeEmail }) {
  if (!isConfigured()) {
    logger.warn({ msg: 'Google Calendar no configurado — falta GOOGLE_CALENDAR_REFRESH_TOKEN' });
    return null;
  }

  const auth = getOAuth2Client();
  auth.setCredentials({ refresh_token: config.calendar.googleRefreshToken });

  const calendar = google.calendar({ version: 'v3', auth });

  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date(start.getTime() + durationMinutes * 60 * 1000);

  const eventBody = {
    summary,
    description: description || '',
    start: { dateTime: start.toISOString(), timeZone: 'America/Argentina/Buenos_Aires' },
    end:   { dateTime: end.toISOString(),   timeZone: 'America/Argentina/Buenos_Aires' },
    conferenceData: {
      createRequest: {
        requestId: `crm-dana-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  if (attendeeEmail) {
    eventBody.attendees = [{ email: attendeeEmail }];
  }

  const response = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    sendUpdates: attendeeEmail ? 'all' : 'none',
    requestBody: eventBody,
  });

  const meetEntry = response.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video');

  return {
    eventId:  response.data.id,
    eventUrl: response.data.htmlLink,
    meetUrl:  meetEntry?.uri || null,
  };
}

/** Compatibilidad con SDR agent — el link de agendamiento lo maneja el usuario desde la UI */
async function getSchedulingLink() {
  return null;
}

/** Devuelve un cliente OAuth2 autenticado para uso en otros módulos (ej: Sheets) */
function getAuthenticatedClient() {
  if (!isConfigured()) return null;
  const auth = getOAuth2Client();
  auth.setCredentials({ refresh_token: config.calendar.googleRefreshToken });
  return auth;
}

module.exports = { createEvent, getSchedulingLink, getAuthUrl, exchangeCode, isConfigured, getAuthenticatedClient };
