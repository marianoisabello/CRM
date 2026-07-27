-- Agente 04 · Briefing Automático — schema Supabase
-- Proyecto: hgzyfatstcjgvjmseusf
-- Correr en SQL Editor (o via scripts/apply-briefings-sql.js)

-- ─── briefings ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS briefings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_email            TEXT NOT NULL,
  lead_id               UUID,
  perfil_email          TEXT,
  reunion_id            UUID,
  propuesta_id          UUID,
  objetivo_cliente      TEXT,
  servicios_sugeridos   JSONB DEFAULT '[]'::jsonb,
  presupuesto_estimado  TEXT,
  plazo                 TEXT,
  kpis                  JSONB DEFAULT '[]'::jsonb,
  riesgos_detectados    JSONB DEFAULT '[]'::jsonb,
  diferenciadores       JSONB DEFAULT '[]'::jsonb,
  resumen_ejecutivo     TEXT,
  brief_markdown        TEXT,
  brief_completo_url    TEXT,
  version               INT DEFAULT 1,
  status                TEXT DEFAULT 'DRAFT'
                          CHECK (status IN ('DRAFT','REVISADO','ENVIADO','error')),
  error_message         TEXT,
  raw_llm               JSONB DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_briefings_lead_email ON briefings(lead_email);
CREATE INDEX IF NOT EXISTS idx_briefings_lead_id ON briefings(lead_id);
CREATE INDEX IF NOT EXISTS idx_briefings_status ON briefings(status);
CREATE INDEX IF NOT EXISTS idx_briefings_updated_at ON briefings(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_briefings_reunion ON briefings(reunion_id);
CREATE INDEX IF NOT EXISTS idx_briefings_propuesta ON briefings(propuesta_id);

-- Soft migrations if table already existed with fewer columns
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS lead_id UUID;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS perfil_email TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS reunion_id UUID;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS propuesta_id UUID;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS objetivo_cliente TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS servicios_sugeridos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS presupuesto_estimado TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS plazo TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS kpis JSONB DEFAULT '[]'::jsonb;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS riesgos_detectados JSONB DEFAULT '[]'::jsonb;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS diferenciadores JSONB DEFAULT '[]'::jsonb;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS resumen_ejecutivo TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS brief_markdown TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS brief_completo_url TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS raw_llm JSONB DEFAULT '{}'::jsonb;
