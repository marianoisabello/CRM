'use strict';

/**
 * Cifrado simétrico AES-256-GCM para tokens OAuth guardados en DB.
 * Clave: TOKEN_ENCRYPTION_KEY (recomendado, 32+ chars) — fallback JWT_SECRET.
 * Formato: base64url(iv) . base64url(tag) . base64url(ciphertext)
 */

const crypto = require('crypto');
const config = require('../config');

function keyBytes() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY || config.jwt.secret || '';
  if (!raw) throw new Error('Falta TOKEN_ENCRYPTION_KEY o JWT_SECRET para cifrar tokens');
  return crypto.createHash('sha256').update(raw).digest();
}

function encrypt(plain) {
  if (plain == null || plain === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString('base64url')).join('.');
}

function decrypt(packed) {
  if (!packed) return null;
  const [ivB, tagB, encB] = String(packed).split('.');
  if (!ivB || !tagB || !encB) throw new Error('Token cifrado con formato inválido');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(ivB, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64url'));
  const dec = Buffer.concat([decipher.update(Buffer.from(encB, 'base64url')), decipher.final()]);
  return dec.toString('utf8');
}

/** Firma HMAC corta para el `state` de OAuth (evita states forjados). */
function signState(payloadObj) {
  const body = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = crypto.createHmac('sha256', keyBytes()).update(body).digest('base64url').slice(0, 32);
  return `${body}.${sig}`;
}

function verifyState(state) {
  const [body, sig] = String(state || '').split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', keyBytes()).update(body).digest('base64url').slice(0, 32);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

module.exports = { encrypt, decrypt, signState, verifyState };
