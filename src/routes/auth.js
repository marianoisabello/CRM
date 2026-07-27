'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../db/client');
const config = require('../config');
const logger = require('../lib/logger');
const calendar = require('../integrations/calendar');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ ok: false, error: 'Email y password requeridos' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, role, name')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    // Auth failures (missing user / DB lookup miss) → 401, never 500
    if (error) {
      logger.warn({ msg: 'Login lookup error', error: error.message });
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
    }
    if (!user || !user.password_hash) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
    }

    let valid = false;
    try {
      valid = await bcrypt.compare(password, user.password_hash);
    } catch (hashErr) {
      logger.warn({ msg: 'Login hash compare failed', error: hashErr.message });
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
    }
    if (!valid) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
    }

    if (!config.jwt.secret) {
      logger.error({ msg: 'JWT_SECRET no configurado' });
      return res.status(500).json({ ok: false, error: 'Auth no configurado' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      config.jwt.secret,
      { expiresIn: '12h' }
    );

    logger.info({ msg: 'Login exitoso', email: user.email, role: user.role });
    return res.json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
    });
  } catch (err) {
    logger.error({ msg: 'Login falló', error: err.message });
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  // requireAuth ya corrió, req.user está disponible
  return res.json({ ok: true, user: req.user });
});

// POST /api/auth/register (solo admin puede crear usuarios)
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ ok: false, error: 'Email y password requeridos' });
  if (password.length < 8) return res.status(400).json({ ok: false, error: 'Password mínimo 8 caracteres' });

  const password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .insert({ name, email: email.toLowerCase().trim(), password_hash, role: 'admin' })
    .select('id, email, role, name')
    .single();

  if (error) return res.status(400).json({ ok: false, error: 'Email ya existe o error al crear usuario' });

  logger.info({ msg: 'Usuario creado', email: data.email });
  return res.json({ ok: true, user: data });
});

// GET /api/auth/google-calendar — redirige al flujo OAuth de Google (solo admin, una vez)
router.get('/google-calendar', (req, res) => {
  if (!config.calendar.googleClientId || !config.calendar.googleClientSecret) {
    return res.status(400).send('Faltan GOOGLE_CALENDAR_CLIENT_ID y GOOGLE_CALENDAR_CLIENT_SECRET en las variables de entorno.');
  }
  const url = calendar.getAuthUrl();
  return res.redirect(url);
});

// GET /api/auth/google-callback — Google redirige acá con el código
router.get('/google-callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.status(400).send(`Google rechazó la autorización: ${error}`);
  if (!code) return res.status(400).send('Código de autorización faltante.');

  try {
    const tokens = await calendar.exchangeCode(code);
    logger.info({ msg: 'Google Calendar autorizado', hasRefreshToken: !!tokens.refresh_token });

    if (!tokens.refresh_token) {
      return res.send(`
        <h2>⚠️ No se recibió refresh_token</h2>
        <p>Esto pasa cuando la cuenta ya autorizó la app antes. Revocá el acceso en
        <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>
        y volvé a intentar.</p>
      `);
    }

    return res.send(`
      <html><body style="font-family:monospace;padding:2rem;background:#111;color:#eee">
        <h2 style="color:#a78bfa">✅ Google Calendar autorizado</h2>
        <p>Copiá este valor y agregalo como variable de entorno en Railway:</p>
        <pre style="background:#1f2937;padding:1rem;border-radius:8px;word-break:break-all">
GOOGLE_CALENDAR_REFRESH_TOKEN=${tokens.refresh_token}
        </pre>
        <p style="color:#6b7280;margin-top:1rem">Una vez agregada la variable, reiniciá el servidor. Ya podés cerrar esta ventana.</p>
      </body></html>
    `);
  } catch (err) {
    logger.error({ msg: 'Error en Google Calendar callback', error: err.message });
    return res.status(500).send(`Error: ${err.message}`);
  }
});

module.exports = router;
