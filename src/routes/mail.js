'use strict';

/**
 * /api/mail — Bandeja Gmail (solo lectura) por usuario.
 * Público: GET /api/mail/oauth/callback (Google redirige acá; el state firmado lleva el usuario).
 * Protegido (JWT): status, auth/start, disconnect, threads, threads/:id.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../db/client');
const logger = require('../lib/logger');
const gmail = require('../integrations/gmail');
const { signState, verifyState } = require('../lib/tokenCrypto');

function publicStatus(req, row) {
  return {
    provider: 'gmail',
    env_ready: gmail.envReady(),
    connected: Boolean(row?.refresh_token_enc),
    account_email: row?.account_email || null,
    last_error: row?.last_error || null,
    updated_at: row?.updated_at || null,
    setup: gmail.setupSteps(req),
  };
}

// GET /api/mail/status
router.get('/status', async (req, res) => {
  try {
    let row = null;
    let missingTable = false;
    try {
      row = await gmail.getTokenRow(req.user.email);
    } catch (err) {
      if (err.code === 'MISSING_TABLE') missingTable = true;
      else throw err;
    }
    return res.json({ ok: true, ...publicStatus(req, row), missing_table: missingTable ? 'user_oauth_tokens' : null });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/mail/auth/start → { url }
router.get('/auth/start', async (req, res) => {
  if (!gmail.envReady()) {
    return res.status(400).json({ ok: false, error: 'Credenciales OAuth de Google no configuradas en el servidor.', setup: gmail.setupSteps(req) });
  }
  try {
    // Verifica que exista la tabla antes de mandar al usuario a Google
    await gmail.getTokenRow(req.user.email);
    const state = signState({ u: req.user.email, p: 'gmail', n: crypto.randomBytes(8).toString('hex'), t: Date.now() });
    const url = gmail.buildAuthUrl(req, state);
    return res.json({ ok: true, url });
  } catch (err) {
    if (err.code === 'MISSING_TABLE') return res.status(409).json({ ok: false, error: err.message, missing_table: 'user_oauth_tokens', setup: gmail.setupSteps(req) });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/mail/oauth/callback — público
router.get('/oauth/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.status(400).send(`OAuth rechazado: ${String(error)}`);
  if (!code || !state) return res.status(400).send('Falta code o state');
  const parsed = verifyState(state);
  if (!parsed || parsed.p !== 'gmail' || !parsed.u) return res.status(400).send('State inválido');
  if (Date.now() - Number(parsed.t || 0) > 15 * 60 * 1000) return res.status(400).send('State vencido, volvé a intentar desde el CRM');

  try {
    const result = await gmail.exchangeCode(req, String(code));
    await gmail.saveTokens(parsed.u, result);
    logger.info({ msg: 'Gmail conectado', user: parsed.u, account: result.accountEmail });
    return res.send(`<!DOCTYPE html><html lang="es"><body style="font-family:system-ui;padding:2rem;background:#0a0a10;color:#fff">
      <h2 style="color:#2bd4bd">✓ Gmail conectado</h2>
      <p style="color:#8a8a9c">Cuenta: ${result.accountEmail || '—'}</p>
      <p style="color:#8a8a9c">Volviendo a la Bandeja…</p>
      <script>setTimeout(function(){ window.location.href='/app.html#mail'; }, 1200);</script>
    </body></html>`);
  } catch (err) {
    logger.error({ msg: 'Gmail OAuth callback falló', error: err.message });
    try {
      await supabase.from('user_oauth_tokens').upsert(
        { user_email: parsed.u, provider: 'gmail', last_error: err.message, updated_at: new Date().toISOString() },
        { onConflict: 'user_email,provider' }
      );
    } catch (_) {}
    return res.status(500).send(`Error OAuth Gmail: ${err.message}`);
  }
});

// POST /api/mail/disconnect
router.post('/disconnect', async (req, res) => {
  try {
    await gmail.deleteTokens(req.user.email);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

async function requireGmail(req, res) {
  let ctx = null;
  try {
    ctx = await gmail.gmailForUser(req, req.user.email);
  } catch (err) {
    if (err.code === 'MISSING_TABLE') {
      res.status(409).json({ ok: false, error: err.message, missing_table: 'user_oauth_tokens' });
      return null;
    }
    throw err;
  }
  if (!ctx) {
    res.status(412).json({ ok: false, error: 'Gmail no conectado', not_connected: true });
    return null;
  }
  return ctx;
}

function gmailError(res, err, userEmail) {
  const msg = err?.response?.data?.error?.message || err.message || 'Error Gmail';
  const code = err?.code || err?.response?.status;
  logger.warn({ msg: 'Gmail API error', error: msg, code });
  if (code === 401 || code === 400 || /invalid_grant/i.test(msg)) {
    supabase.from('user_oauth_tokens').update({ last_error: msg }).eq('user_email', userEmail).eq('provider', 'gmail').then(() => {});
    return res.status(401).json({ ok: false, error: 'La autorización de Gmail venció o fue revocada. Volvé a conectar.', reconnect: true });
  }
  if (code === 403) return res.status(403).json({ ok: false, error: `Google rechazó la lectura: ${msg}. Revisá que la Gmail API esté habilitada y el scope gmail.readonly aprobado.` });
  return res.status(502).json({ ok: false, error: msg });
}

// GET /api/mail/threads?q=&pageToken=&label=INBOX
router.get('/threads', async (req, res) => {
  try {
    const ctx = await requireGmail(req, res);
    if (!ctx) return;
    const label = req.query.label ? [String(req.query.label)] : ['INBOX'];
    const data = await gmail.listThreads(ctx.gmail, {
      q: req.query.q ? String(req.query.q).slice(0, 200) : undefined,
      pageToken: req.query.pageToken,
      maxResults: req.query.limit || 25,
      labelIds: req.query.q ? undefined : label,
    });
    return res.json({ ok: true, account_email: ctx.row.account_email, ...data });
  } catch (err) {
    return gmailError(res, err, req.user.email);
  }
});

// GET /api/mail/threads/:id — hilo completo + contactos del CRM que matchean por email
router.get('/threads/:id', async (req, res) => {
  try {
    const ctx = await requireGmail(req, res);
    if (!ctx) return;
    const thread = await gmail.getThread(ctx.gmail, req.params.id);
    const emails = [...new Set(thread.messages.flatMap((m) => [m.from?.email, ...m.to.map((x) => x.email), ...m.cc.map((x) => x.email)]).filter(Boolean))]
      .filter((e) => e !== (ctx.row.account_email || '').toLowerCase())
      .slice(0, 20);

    let matches = [];
    if (emails.length) {
      const [leadsR, contactsR] = await Promise.all([
        supabase.from('leads').select('id, name, email, status, classification, score').in('email', emails).order('updated_at', { ascending: false }).limit(20),
        supabase.from('contacts').select('id, name, email, lead_id, companies(id, name)').in('email', emails).limit(20),
      ]);
      const contactByEmail = Object.fromEntries((contactsR.data || []).map((c) => [String(c.email).toLowerCase(), c]));
      const seen = new Set();
      for (const l of leadsR.data || []) {
        const key = String(l.email).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const c = contactByEmail[key];
        matches.push({ email: key, lead_id: l.id, name: l.name || c?.name || null, status: l.status, classification: l.classification, score: l.score, contact_id: c?.id || null, company: c?.companies?.name || null, href: l.status === 'won' ? `#contacts/${l.id}` : '#leads' });
      }
      for (const [key, c] of Object.entries(contactByEmail)) {
        if (seen.has(key)) continue;
        matches.push({ email: key, lead_id: c.lead_id, name: c.name, contact_id: c.id, company: c.companies?.name || null, href: c.lead_id ? `#contacts/${c.lead_id}` : '#contacts' });
      }
    }
    return res.json({ ok: true, thread, matches });
  } catch (err) {
    return gmailError(res, err, req.user.email);
  }
});

module.exports = router;
