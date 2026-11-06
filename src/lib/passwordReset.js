'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const supabase = require('../db/client');
const logger = require('./logger');

const TOKEN_TTL_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 3;
const ALLOWED_HOSTS = new Set(['crm-murex-tau.vercel.app', 'crm-pampai.vercel.app']);

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function mailerConfigured() {
  return Boolean(process.env.PASSWORD_RESET_WEBHOOK_URL && process.env.PASSWORD_RESET_WEBHOOK_SECRET);
}

function publicBase(req) {
  const host = String(req.headers['x-forwarded-host'] || req.get('host') || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (ALLOWED_HOSTS.has(host)) return `https://${host}`;
  const configured = (process.env.CRM_PUBLIC_URL || '').replace(/\/$/, '');
  if (configured) return configured;
  return 'https://crm-murex-tau.vercel.app';
}

async function sendResetEmail({ to, resetUrl }) {
  const url = process.env.PASSWORD_RESET_WEBHOOK_URL;
  const secret = process.env.PASSWORD_RESET_WEBHOOK_SECRET;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-crm-reset-secret': secret,
    },
    body: JSON.stringify({ to, resetUrl }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    logger.error({ msg: 'No se pudo enviar el mail de reset', status: res.status, detail: detail.slice(0, 200) });
    return false;
  }
  return true;
}

/**
 * Siempre responde igual si el mailer está bien, exista o no la cuenta.
 * Devuelve { ok: false, status } solo cuando el envío no está disponible.
 */
async function requestPasswordReset(req, email) {
  if (!mailerConfigured()) {
    logger.error({ msg: 'Password reset pedido sin mailer configurado' });
    return { ok: false, status: 503, error: 'El restablecimiento no está disponible en este momento. Probá más tarde.' };
  }

  const normalized = String(email || '').toLowerCase().trim();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false, status: 400, error: 'Ingresá un email válido' };
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', normalized)
    .maybeSingle();

  if (error) {
    logger.warn({ msg: 'Lookup de reset falló', error: error.message });
    return { ok: true };
  }
  if (!user) return { ok: true };

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from('password_resets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since);

  if (countError) {
    logger.warn({ msg: 'No se pudo contar resets', error: countError.message });
    return { ok: true };
  }
  if ((count || 0) >= MAX_REQUESTS_PER_HOUR) return { ok: true };

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  const { data: row, error: insertError } = await supabase
    .from('password_resets')
    .insert({ user_id: user.id, token_hash: hashToken(token), expires_at: expiresAt })
    .select('id')
    .single();

  if (insertError) {
    logger.error({ msg: 'No se pudo guardar el token de reset', error: insertError.message });
    return { ok: false, status: 503, error: 'No pudimos iniciar el restablecimiento. Probá de nuevo en unos minutos.' };
  }

  const resetUrl = `${publicBase(req)}/reset.html?token=${token}`;
  const sent = await sendResetEmail({ to: user.email, resetUrl });
  if (!sent) {
    await supabase.from('password_resets').delete().eq('id', row.id);
    return { ok: false, status: 503, error: 'No pudimos enviar el correo. Probá de nuevo en unos minutos.' };
  }

  logger.info({ msg: 'Mail de reset enviado', email: user.email });
  return { ok: true };
}

async function resetPassword(token, password) {
  if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return { ok: false, status: 400, error: 'El enlace no es válido o ya venció. Pedí uno nuevo desde el login.' };
  }
  if (!password || typeof password !== 'string' || password.length < 8 || password.length > 200) {
    return { ok: false, status: 400, error: 'La contraseña nueva tiene que tener al menos 8 caracteres.' };
  }

  const now = new Date().toISOString();
  const { data: row, error } = await supabase
    .from('password_resets')
    .select('id, user_id, expires_at, used_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle();

  if (error || !row || row.used_at || row.expires_at <= now) {
    return { ok: false, status: 400, error: 'El enlace no es válido o ya venció. Pedí uno nuevo desde el login.' };
  }

  const password_hash = await bcrypt.hash(password, 10);
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash })
    .eq('id', row.user_id);

  if (updateError) {
    logger.error({ msg: 'No se pudo actualizar la contraseña', error: updateError.message });
    return { ok: false, status: 500, error: 'No pudimos guardar la contraseña nueva. Probá de nuevo.' };
  }

  await supabase
    .from('password_resets')
    .update({ used_at: now })
    .eq('user_id', row.user_id)
    .is('used_at', null);

  logger.info({ msg: 'Contraseña restablecida', user_id: row.user_id });
  return { ok: true };
}

module.exports = { requestPasswordReset, resetPassword };
