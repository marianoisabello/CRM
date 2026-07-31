-- ═══════════════════════════════════════════════════════════════
-- M3 — pipeline_stages (deals) + deals
-- Convive con Kanban de leads (status en leads). No lo modifica.
-- Requiere: 001_companies, 002_contacts, users, leads
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  position    INT NOT NULL DEFAULT 0,
  is_won      BOOLEAN NOT NULL DEFAULT FALSE,
  is_lost     BOOLEAN NOT NULL DEFAULT FALSE,
  celebrate   BOOLEAN NOT NULL DEFAULT FALSE,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_position
  ON pipeline_stages (position)
  WHERE active = TRUE;

-- Seed etapas (idempotente por key)
INSERT INTO pipeline_stages (key, name, position, is_won, is_lost, celebrate, active)
VALUES
  ('prospeccion',  'Prospección',  10, FALSE, FALSE, FALSE, TRUE),
  ('propuesta',    'Propuesta',    20, FALSE, FALSE, FALSE, TRUE),
  ('negociacion',  'Negociación',  30, FALSE, FALSE, FALSE, TRUE),
  ('ganado',       'Ganado',       40, TRUE,  FALSE, TRUE,  TRUE),
  ('perdido',      'Perdido',      50, FALSE, TRUE,  FALSE, TRUE)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  position = EXCLUDED.position,
  is_won = EXCLUDED.is_won,
  is_lost = EXCLUDED.is_lost,
  celebrate = EXCLUDED.celebrate,
  active = EXCLUDED.active;

CREATE TABLE IF NOT EXISTS deals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  value             NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'USD',
  stage             TEXT NOT NULL DEFAULT 'prospeccion'
                    REFERENCES pipeline_stages(key),
  probability       INT NOT NULL DEFAULT 0
                    CHECK (probability >= 0 AND probability <= 100),
  expected_close    DATE,
  stage_entered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contact_id        UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id        UUID REFERENCES companies(id) ON DELETE SET NULL,
  lead_id           UUID REFERENCES leads(id) ON DELETE SET NULL,
  owner_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  source            TEXT,
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'won', 'lost')),
  won_at            TIMESTAMPTZ,
  lost_at           TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals (stage);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals (status);
CREATE INDEX IF NOT EXISTS idx_deals_company ON deals (company_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals (contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_lead ON deals (lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner ON deals (owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close ON deals (expected_close);

DO $$ BEGIN
  CREATE TRIGGER deals_updated_at
    BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
