-- ═══════════════════════════════════════════════════════════════
-- M1 — companies
-- CRM Dana · Operativa CRM (convive con clients)
-- Idempotente. NO ejecutar en producción sin verificación local.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  industry    TEXT,
  size        TEXT,
  website     TEXT,
  city        TEXT,
  owner_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies (name);
CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies (owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_created ON companies (created_at DESC);

DO $$ BEGIN
  CREATE TRIGGER companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
