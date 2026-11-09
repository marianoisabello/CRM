'use strict';

/**
 * Gmail (solo lectura) por usuario del CRM.
 * - OAuth con scope gmail.readonly (+ email para identificar la cuenta).
 * - Tokens cifrados en user_oauth_tokens (provider='gmail'). Nunca en el front.
 * - Reusa el mismo OAuth client de Google del proyecto si no hay uno específico.
 */

const { google } = require('googleapis');
const config = require('../config');
const supabase = require('../db/client');
const logger = require('../lib/logger');
const { encrypt, decrypt } = require('../lib/tokenCrypto');

const PROVIDER = 'gmail';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
];

function clientId() {
  return process.env.GOOGLE_GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || config.calendar.googleClientId || null;
}
function clientSecret() {
  return process.env.GOOGLE_GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || config.calendar.googleClientSecret || null;
}
function envReady() {
  return Boolean(clientId() && clientSecret());
}

function baseUrl(req) {
  return (
    process.env.CRM_PUBLIC_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    `${req.protocol}://${req.get('host')}`
  );
}

function redirectUri(req) {
  return process.env.GMAIL_REDIRECT_URI || `${baseUrl(req)}/api/mail/oauth/callback`;
}

function oauthClient(req) {
  return new google.auth.OAuth2(clientId(), clientSecret(), redirectUri(req));
}

function setupSteps(req) {
  return {
    title: 'Gmail (solo lectura)',
    redirect_uri: redirectUri(req),
    scopes: SCOPES,
    steps: [
      'Google Cloud Console → APIs y servicios → Biblioteca: habilitá "Gmail API".',
      'Pantalla de consentimiento OAuth: agregá el scope https://www.googleapis.com/auth/gmail.readonly (es un scope restringido: en modo "Testing" alcanza con sumar los emails del equipo como test users; en producción Google pide verificación).',
      `Credenciales → cliente OAuth "Aplicación web": agregá como URI de redirección autorizado: ${redirectUri(req)}`,
      'Vercel → variables: GOOGLE_GMAIL_CLIENT_ID y GOOGLE_GMAIL_CLIENT_SECRET (o reutilizá GOOGLE_CLIENT_ID / GOOGLE_CALENDAR_CLIENT_ID ya existentes agregándoles el scope y la redirect URI).',
      'Opcional pero recomendado: TOKEN_ENCRYPTION_KEY (32+ caracteres) para cifrar los tokens en la base; si falta se usa JWT_SECRET.',
      'Supabase → SQL Editor: ejecutá scripts/migrations/010_user_oauth_tokens.sql.',
    ],
  };
}

function buildAuthUrl(req, state) {
  const client = oauthClient(req);
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: SCOPES,
    state,
  });
}

async function exchangeCode(req, code) {
  const client = oauthClient(req);
  const { tokens } = await client.getToken(code);
  let accountEmail = null;
  if (tokens.access_token) {
    try {
      const me = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (me.ok) accountEmail = (await me.json()).email || null;
    } catch (_) {}
  }
  return { tokens, accountEmail };
}

async function saveTokens(userEmail, { tokens, accountEmail }) {
  const existing = await getTokenRow(userEmail);
  const row = {
    user_email: userEmail,
    provider: PROVIDER,
    account_email: accountEmail || existing?.account_email || null,
    access_token_enc: tokens.access_token ? encrypt(tokens.access_token) : existing?.access_token_enc || null,
    expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : existing?.expiry_date || null,
    scope: tokens.scope || existing?.scope || SCOPES.join(' '),
    last_error: null,
    updated_at: new Date().toISOString(),
  };
  // Google solo manda refresh_token la primera vez (o con prompt=consent). Conservar el anterior si no viene.
  if (tokens.refresh_token) row.refresh_token_enc = encrypt(tokens.refresh_token);
  else if (existing?.refresh_token_enc) row.refresh_token_enc = existing.refresh_token_enc;

  const { data, error } = await supabase
    .from('user_oauth_tokens')
    .upsert(row, { onConflict: 'user_email,provider' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function getTokenRow(userEmail) {
  const { data, error } = await supabase
    .from('user_oauth_tokens')
    .select('*')
    .eq('user_email', userEmail)
    .eq('provider', PROVIDER)
    .maybeSingle();
  if (error) {
    if (/schema cache|does not exist|PGRST205/i.test(error.message)) {
      const e = new Error('Falta la tabla user_oauth_tokens (scripts/migrations/010_user_oauth_tokens.sql)');
      e.code = 'MISSING_TABLE';
      throw e;
    }
    throw new Error(error.message);
  }
  return data || null;
}

async function deleteTokens(userEmail) {
  const { error } = await supabase.from('user_oauth_tokens').delete().eq('user_email', userEmail).eq('provider', PROVIDER);
  if (error && !/schema cache|does not exist|PGRST205/i.test(error.message)) throw new Error(error.message);
}

/** Devuelve un cliente gmail autenticado para el usuario o null si no está conectado. */
async function gmailForUser(req, userEmail) {
  const row = await getTokenRow(userEmail);
  if (!row || !row.refresh_token_enc) return null;
  const auth = oauthClient(req);
  auth.setCredentials({
    refresh_token: decrypt(row.refresh_token_enc),
    access_token: row.access_token_enc ? decrypt(row.access_token_enc) : undefined,
    expiry_date: row.expiry_date ? new Date(row.expiry_date).getTime() : undefined,
  });
  auth.on('tokens', (tokens) => {
    saveTokens(userEmail, { tokens, accountEmail: row.account_email }).catch((err) =>
      logger.warn({ msg: 'No se pudo persistir refresh de token Gmail', error: err.message })
    );
  });
  return { gmail: google.gmail({ version: 'v1', auth }), row };
}

// ─── Parsing de mensajes ──────────────────────────────────────────────────────

function header(headers, name) {
  const h = (headers || []).find((x) => String(x.name).toLowerCase() === name.toLowerCase());
  return h ? h.value : null;
}

function b64decode(data) {
  if (!data) return '';
  return Buffer.from(String(data).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function walkParts(part, out) {
  if (!part) return;
  const mime = part.mimeType || '';
  if (part.filename && part.body?.attachmentId) {
    out.attachments.push({ filename: part.filename, mimeType: mime, size: part.body.size || 0 });
  } else if (mime === 'text/plain' && part.body?.data && !out.text) {
    out.text = b64decode(part.body.data);
  } else if (mime === 'text/html' && part.body?.data && !out.html) {
    out.html = b64decode(part.body.data);
  }
  for (const p of part.parts || []) walkParts(p, out);
}

function parseAddress(raw) {
  if (!raw) return { name: null, email: null, raw: null };
  const m = String(raw).match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || null, email: m[2].trim().toLowerCase(), raw };
  const e = String(raw).trim();
  return { name: null, email: e.toLowerCase(), raw };
}

function splitAddresses(raw) {
  if (!raw) return [];
  return String(raw).split(',').map((s) => parseAddress(s)).filter((a) => a.email);
}

function parseMessage(msg, { withBody = false } = {}) {
  const headers = msg.payload?.headers || [];
  const out = { text: '', html: '', attachments: [] };
  if (withBody) walkParts(msg.payload, out);
  const from = parseAddress(header(headers, 'From'));
  return {
    id: msg.id,
    thread_id: msg.threadId,
    snippet: msg.snippet || '',
    subject: header(headers, 'Subject') || '(sin asunto)',
    from,
    to: splitAddresses(header(headers, 'To')),
    cc: splitAddresses(header(headers, 'Cc')),
    date: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : header(headers, 'Date'),
    labels: msg.labelIds || [],
    unread: (msg.labelIds || []).includes('UNREAD'),
    ...(withBody ? { text: out.text, html: out.html, attachments: out.attachments } : {}),
  };
}

async function listThreads(gmail, { q, pageToken, maxResults = 25, labelIds } = {}) {
  const res = await gmail.users.threads.list({
    userId: 'me',
    q: q || undefined,
    pageToken: pageToken || undefined,
    maxResults: Math.min(50, Number(maxResults) || 25),
    labelIds: labelIds || undefined,
  });
  const threads = res.data.threads || [];
  // Metadata del último mensaje de cada hilo (headers livianos)
  const details = await Promise.all(
    threads.map((t) =>
      gmail.users.threads
        .get({ userId: 'me', id: t.id, format: 'metadata', metadataHeaders: ['From', 'To', 'Subject', 'Date'] })
        .then((r) => r.data)
        .catch(() => null)
    )
  );
  const rows = details
    .filter(Boolean)
    .map((t) => {
      const msgs = (t.messages || []).map((m) => parseMessage(m));
      const last = msgs[msgs.length - 1] || {};
      const first = msgs[0] || {};
      return {
        id: t.id,
        snippet: last.snippet || t.snippet || '',
        subject: first.subject || last.subject || '(sin asunto)',
        from: last.from,
        participants: [...new Set(msgs.flatMap((m) => [m.from?.email, ...m.to.map((x) => x.email)]).filter(Boolean))],
        date: last.date,
        message_count: msgs.length,
        unread: msgs.some((m) => m.unread),
        labels: last.labels || [],
      };
    });
  return { threads: rows, nextPageToken: res.data.nextPageToken || null, resultSizeEstimate: res.data.resultSizeEstimate || null };
}

async function getThread(gmail, id) {
  const res = await gmail.users.threads.get({ userId: 'me', id, format: 'full' });
  const msgs = (res.data.messages || []).map((m) => parseMessage(m, { withBody: true }));
  return { id: res.data.id, subject: msgs[0]?.subject || '(sin asunto)', messages: msgs };
}

module.exports = {
  PROVIDER,
  SCOPES,
  envReady,
  setupSteps,
  buildAuthUrl,
  exchangeCode,
  saveTokens,
  getTokenRow,
  deleteTokens,
  gmailForUser,
  listThreads,
  getThread,
};
