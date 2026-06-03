'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../db/client');
const config = require('../config');
const logger = require('../lib/logger');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email y password requeridos' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, password_hash, role, name')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (error || !user) {
    return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    config.jwt.secret,
    { expiresIn: '12h' }
  );

  logger.info({ msg: 'Login exitoso', email: user.email, role: user.role });
  return res.json({ ok: true, token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
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

module.exports = router;
