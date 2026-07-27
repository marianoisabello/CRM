-- Agente 03 · Análisis de Reuniones — schema Supabase
-- Proyecto: hgzyfatstcjgvjmseusf
-- Correr en SQL Editor (o via scripts/apply-sql.js)

-- ─── reuniones ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reuniones (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha               TIMESTAMPTZ,
  duracion_min        INT,
  participantes       JSONB DEFAULT '[]'::jsonb,
  lead_email          TEXT,
  lead_phone          TEXT,
  lead_id             UUID,
  titulo              TEXT,
  resumen             TEXT,
  pain_points         JSONB DEFAULT '[]'::jsonb,
  objeciones          JSONB DEFAULT '[]'::jsonb,
  nivel_interes       TEXT CHECK (nivel_interes IS NULL OR nivel_interes IN ('ALTO','MEDIO','BAJO')),
  senales_compra      JSONB DEFAULT '[]'::jsonb,
  proximos_pasos      JSONB DEFAULT '[]'::jsonb,
  frases_destacadas   JSONB DEFAULT '[]'::jsonb,
  score_cierre        INT DEFAULT 0 CHECK (score_cierre >= 0 AND score_cierre <= 100),
  transcript          TEXT,
  transcript_url      TEXT,
  recording_url       TEXT,
  source              TEXT DEFAULT 'manual',  -- manual | zoom | google_meet | whatsapp | webhook
  external_id         TEXT,
  status              TEXT DEFAULT 'pending'
                        CHECK (status IN ('pending','analyzing','done','error')),
  error_message       TEXT,
  raw_payload         JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reuniones_status ON reuniones(status);
CREATE INDEX IF NOT EXISTS idx_reuniones_lead_email ON reuniones(lead_email);
CREATE INDEX IF NOT EXISTS idx_reuniones_fecha ON reuniones(fecha DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_reuniones_source ON reuniones(source);
CREATE INDEX IF NOT EXISTS idx_reuniones_updated_at ON reuniones(updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reuniones_external
  ON reuniones(source, external_id)
  WHERE external_id IS NOT NULL;

-- ─── user_integrations (Zoom / Google Meet / WhatsApp) ───────────────────────
CREATE TABLE IF NOT EXISTS user_integrations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID,
  user_email          TEXT,
  provider            TEXT NOT NULL CHECK (provider IN ('zoom','google_meet','whatsapp')),
  status              TEXT DEFAULT 'disconnected'
                        CHECK (status IN ('disconnected','pending_config','connected','error')),
  external_account    TEXT,
  -- Never commit secrets. Tokens may be stored encrypted at rest by the app;
  -- prefer env vars for server-side API keys. token_meta holds non-secret flags.
  token_meta          JSONB DEFAULT '{}'::jsonb,
  last_sync_at        TIMESTAMPTZ,
  last_error          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_email, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_provider ON user_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_user_integrations_user ON user_integrations(user_email);

-- Soft migrations if tables already existed with fewer columns
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS titulo TEXT;
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS lead_phone TEXT;
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS lead_id UUID;
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS transcript_url TEXT;
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS raw_payload JSONB DEFAULT '{}'::jsonb;
