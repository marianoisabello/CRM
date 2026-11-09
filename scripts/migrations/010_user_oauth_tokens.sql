-- ═══════════════════════════════════════════════════════════════
-- M10 — user_oauth_tokens (tokens OAuth por usuario, cifrados en la app)
-- Usado por la Bandeja de Gmail (scope gmail.readonly).
-- No modifica user_integrations (que sigue siendo de Agente Reuniones).
-- Los tokens se guardan cifrados con AES-256-GCM usando
-- TOKEN_ENCRYPTION_KEY (fallback JWT_SECRET). Nunca en texto plano.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_oauth_tokens (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email         TEXT NOT NULL,
  provider           TEXT NOT NULL,
  account_email      TEXT,
  refresh_token_enc  TEXT,
  access_token_enc   TEXT,
  expiry_date        TIMESTAMPTZ,
  scope              TEXT,
  last_error         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_email, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_user ON user_oauth_tokens (user_email);

-- Igual que el resto de las tablas: RLS activo, solo accede la service key del backend.
ALTER TABLE user_oauth_tokens ENABLE ROW LEVEL SECURITY;
