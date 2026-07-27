/**
 * User integrations for Agente 03 (Zoom / Google Meet / WhatsApp).
 * OAuth Connect when env credentials exist; otherwise pending_config + setup hints.
 */
'use strict';

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../db/client');
const config = require('../config');
const logger = require('../lib/logger');

const PROVIDERS = ['zoom', 'google_meet', 'whatsapp'];

function envReady(provider) {
  if (provider === 'zoom') {
    return Boolean(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET);
  }
  if (provider === 'google_meet') {
    return Boolean(
      process.env.GOOGLE_CLIENT_ID ||
        config.calendar.googleClientId ||
        process.env.GOOGLE_CALENDAR_CLIENT_ID
    ) && Boolean(
      process.env.GOOGLE_CLIENT_SECRET ||
        config.calendar.googleClientSecret ||
        process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    );
  }
  if (provider === 'whatsapp') {
    return Boolean(process.env.WHAPI_TOKEN || process.env.MANYCHAT_API_KEY);
  }
  return false;
}

function setupHint(provider) {
  if (provider === 'zoom') {
    return {
      title: 'Zoom OAuth',
      steps: [
        'Creá una Zoom OAuth App (Server-to-Server o User OAuth) en marketplace.zoom.us',
        'Agregá en Vercel: ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_REDIRECT_URI',
        'Redirect URI: https://<tu-crm>/api/integrations/oauth/zoom/callback',
        'Webhook opcional: POST /api/hooks/reuniones/zoom (header x-crm-internal-key o ZOOM_WEBHOOK_SECRET)',
      ],
      webhook: '/api/hooks/reuniones/zoom',
    };
  }
  if (provider === 'google_meet') {
    return {
      title: 'Google Meet / Calendar',
      steps: [
        'Usá el mismo proyecto Google Cloud del Calendar del CRM, o creá OAuth client',
        'Env: GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (o GOOGLE_CALENDAR_*)',
        'Scopes: calendar.readonly + meet recordings si aplica',
        'Redirect: https://<tu-crm>/api/integrations/oauth/google_meet/callback',
        'Webhook opcional: POST /api/hooks/reuniones/google',
      ],
      webhook: '/api/hooks/reuniones/google',
    };
  }
  return {
    title: 'WhatsApp (Whapi / ManyChat)',
    steps: [
      'Whapi ya se usa en SDR — NO reemplaces ese webhook',
      'Para reuniones: configurá un webhook adicional o forward selectivo a POST /api/hooks/reuniones/whatsapp',
      'Env opcional: WHAPI_TOKEN (solo lectura de chats) o MANYCHAT_API_KEY',
      'Header: x-crm-internal-key = CRM_INTERNAL_KEY',
    ],
    webhook: '/api/hooks/reuniones/whatsapp',
  };
}

async function upsertIntegration(userEmail, provider, patch) {
  const row = {
    user_email: userEmail,
    provider,
    updated_at: new Date().toISOString(),
    ...patch,
  };
  const { data, error } = await supabase
    .from('user_integrations')
    .upsert(row, { onConflict: 'user_email,provider' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

function publicRow(row, provider) {
  const ready = envReady(provider);
  const status = row?.status || (ready && provider === 'whatsapp' ? 'connected' : ready ? 'pending_config' : 'disconnected');
  return {
    provider,
    status: row?.status || status,
    external_account: row?.external_account || null,
    last_sync_at: row?.last_sync_at || null,
    last_error: row?.last_error || null,
    env_ready: ready,
    can_oauth: ready && (provider === 'zoom' || provider === 'google_meet'),
    setup: setupHint(provider),
    token_meta: {
      has_tokens: Boolean(row?.token_meta?.has_tokens),
      connected_via: row?.token_meta?.connected_via || null,
    },
  };
}

// GET /api/integrations/reuniones — status cards
router.get('/reuniones', async (req, res) => {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ ok: false, error: 'No autorizado' });

  try {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_email', email);
    if (error) throw new Error(error.message);

    const byProvider = Object.fromEntries((data || []).map((r) => [r.provider, r]));
    const integrations = PROVIDERS.map((p) => publicRow(byProvider[p], p));

    // Auto-mark WhatsApp connected if env present and no row yet
    const wa = integrations.find((i) => i.provider === 'whatsapp');
    if (wa && envReady('whatsapp') && !byProvider.whatsapp) {
      wa.status = 'connected';
      wa.token_meta = { has_tokens: true, connected_via: 'env' };
    }

    return res.json({
      ok: true,
      integrations,
      webhooks_base: '/api/hooks/reuniones',
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/integrations/reuniones/:provider/disconnect
router.post('/reuniones/:provider/disconnect', async (req, res) => {
  const provider = req.params.provider;
  if (!PROVIDERS.includes(provider)) {
    return res.status(400).json({ ok: false, error: 'provider inválido' });
  }
  try {
    const row = await upsertIntegration(req.user.email, provider, {
      status: 'disconnected',
      external_account: null,
      token_meta: {},
      last_error: null,
    });
    return res.json({ ok: true, integration: publicRow(row, provider) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/integrations/reuniones/:provider/mark-connected — manual mark when using webhooks only
router.post('/reuniones/:provider/mark-connected', async (req, res) => {
  const provider = req.params.provider;
  if (!PROVIDERS.includes(provider)) {
    return res.status(400).json({ ok: false, error: 'provider inválido' });
  }
  try {
    const row = await upsertIntegration(req.user.email, provider, {
      status: 'connected',
      external_account: req.body?.external_account || null,
      token_meta: { has_tokens: false, connected_via: 'manual_webhook' },
      last_sync_at: new Date().toISOString(),
    });
    return res.json({ ok: true, integration: publicRow(row, provider) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

function baseUrl(req) {
  return (
    process.env.CRM_PUBLIC_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` ||
    `${req.protocol}://${req.get('host')}`
  );
}

function buildOAuthUrl(req, provider, userEmail) {
  const state = Buffer.from(
    JSON.stringify({
      u: userEmail,
      p: provider,
      n: crypto.randomBytes(8).toString('hex'),
    })
  ).toString('base64url');

  const redirectUri =
    process.env[provider === 'zoom' ? 'ZOOM_REDIRECT_URI' : 'GOOGLE_MEET_REDIRECT_URI'] ||
    `${baseUrl(req)}/api/integrations/oauth/${provider}/callback`;

  if (provider === 'zoom') {
    const url = new URL('https://zoom.us/oauth/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', process.env.ZOOM_CLIENT_ID);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    return { url: url.toString(), state, redirectUri };
  }

  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    config.calendar.googleClientId ||
    process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set(
    'scope',
    ['openid', 'email', 'https://www.googleapis.com/auth/calendar.readonly'].join(' ')
  );
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  return { url: url.toString(), state, redirectUri };
}

// GET /api/integrations/oauth/:provider/start — returns { url } for SPA (JWT required)
router.get('/oauth/:provider/start', async (req, res) => {
  const provider = req.params.provider;
  if (provider !== 'zoom' && provider !== 'google_meet') {
    return res.status(400).json({ ok: false, error: 'OAuth solo para zoom y google_meet' });
  }
  if (!envReady(provider)) {
    return res.status(400).json({
      ok: false,
      error: 'Credenciales OAuth no configuradas en el servidor. Configurá en Vercel.',
      setup: setupHint(provider),
    });
  }

  const userEmail = req.user?.email;
  if (!userEmail) return res.status(401).json({ ok: false, error: 'No autorizado' });

  try {
    const { url, state, redirectUri } = buildOAuthUrl(req, provider, userEmail);
    await upsertIntegration(userEmail, provider, {
      status: 'pending_config',
      token_meta: { oauth_state: state, redirect_uri: redirectUri },
    });
    return res.json({ ok: true, url, provider });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/integrations/oauth/:provider/callback — public (no JWT; state carries user)
router.get('/oauth/:provider/callback', async (req, res) => {
  const provider = req.params.provider;
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(`OAuth rechazado: ${error}`);
  }
  if (!code || !state) {
    return res.status(400).send('Falta code o state');
  }

  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(String(state), 'base64url').toString('utf8'));
  } catch {
    return res.status(400).send('State inválido');
  }

  const userEmail = parsed.u;
  if (!userEmail || parsed.p !== provider) {
    return res.status(400).send('State no coincide');
  }

  const redirectUri =
    process.env[provider === 'zoom' ? 'ZOOM_REDIRECT_URI' : 'GOOGLE_MEET_REDIRECT_URI'] ||
    `${baseUrl(req)}/api/integrations/oauth/${provider}/callback`;

  try {
    let account = null;
    let hasRefresh = false;

    if (provider === 'zoom') {
      const basic = Buffer.from(
        `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
      ).toString('base64');
      const tokenRes = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: String(code),
          redirect_uri: redirectUri,
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokenRes.ok) {
        throw new Error(tokens.reason || tokens.error || 'Zoom token exchange failed');
      }
      hasRefresh = Boolean(tokens.refresh_token);
      // Do not persist raw tokens in DB for MVP — mark connected; ops can add ZOOM_ACCOUNT_ID
      account = 'zoom_user';
      if (tokens.access_token) {
        try {
          const me = await fetch('https://api.zoom.us/v2/users/me', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          if (me.ok) {
            const profile = await me.json();
            account = profile.email || profile.id || account;
          }
        } catch (_) {}
      }
    } else {
      const clientId =
        process.env.GOOGLE_CLIENT_ID ||
        config.calendar.googleClientId ||
        process.env.GOOGLE_CALENDAR_CLIENT_ID;
      const clientSecret =
        process.env.GOOGLE_CLIENT_SECRET ||
        config.calendar.googleClientSecret ||
        process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokenRes.ok) {
        throw new Error(tokens.error_description || tokens.error || 'Google token exchange failed');
      }
      hasRefresh = Boolean(tokens.refresh_token);
      if (tokens.access_token) {
        try {
          const me = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          if (me.ok) {
            const profile = await me.json();
            account = profile.email || account;
          }
        } catch (_) {}
      }
    }

    await upsertIntegration(userEmail, provider, {
      status: 'connected',
      external_account: account,
      token_meta: {
        has_tokens: true,
        has_refresh: hasRefresh,
        connected_via: 'oauth',
        connected_at: new Date().toISOString(),
      },
      last_error: null,
      last_sync_at: new Date().toISOString(),
    });

    logger.info({ msg: 'Integración OAuth conectada', provider, userEmail, account });

    return res.send(`<!DOCTYPE html><html><body style="font-family:system-ui;padding:2rem;background:#F8F9FA">
      <h2 style="color:#111827">✓ ${provider === 'zoom' ? 'Zoom' : 'Google Meet'} conectado</h2>
      <p style="color:#6B7280">Cuenta: ${account || '—'}</p>
      <p style="color:#6B7280">Podés cerrar esta ventana y volver a Configuración.</p>
      <script>setTimeout(function(){ window.location.href='/app.html#settings'; }, 1500);</script>
    </body></html>`);
  } catch (err) {
    logger.error({ msg: 'OAuth callback falló', provider, error: err.message });
    try {
      await upsertIntegration(userEmail, provider, {
        status: 'error',
        last_error: err.message,
      });
    } catch (_) {}
    return res.status(500).send(`Error OAuth: ${err.message}`);
  }
});

module.exports = router;
