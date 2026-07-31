-- ═══════════════════════════════════════════════════════════════
-- M6 — ALTER tablas existentes (FKs y columnas puente)
-- Requiere: M1–M5
-- Nota: perfiles puede no existir en installs frescos; el ALTER
--       se envuelve para no fallar si la tabla aún no está.
-- ═══════════════════════════════════════════════════════════════

-- ─── leads ─────────────────────────────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_contact_id UUID;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_deal_id UUID;

DO $$ BEGIN
  ALTER TABLE leads
    ADD CONSTRAINT leads_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE leads
    ADD CONSTRAINT leads_converted_contact_id_fkey
    FOREIGN KEY (converted_contact_id) REFERENCES contacts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE leads
    ADD CONSTRAINT leads_converted_deal_id_fkey
    FOREIGN KEY (converted_deal_id) REFERENCES deals(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads (company_id);
CREATE INDEX IF NOT EXISTS idx_leads_converted_contact ON leads (converted_contact_id);
CREATE INDEX IF NOT EXISTS idx_leads_converted_deal ON leads (converted_deal_id);

-- ─── clients (N clients → 1 company) ───────────────────────────
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_id UUID;

DO $$ BEGIN
  ALTER TABLE clients
    ADD CONSTRAINT clients_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients (company_id);

-- ─── briefings (si existe) ─────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'briefings'
  ) THEN
    ALTER TABLE briefings ADD COLUMN IF NOT EXISTS deal_id UUID;
    BEGIN
      ALTER TABLE briefings
        ADD CONSTRAINT briefings_deal_id_fkey
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    CREATE INDEX IF NOT EXISTS idx_briefings_deal_id ON briefings (deal_id);
  END IF;
END $$;

-- ─── lead_propuestas (si existe) ───────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lead_propuestas'
  ) THEN
    ALTER TABLE lead_propuestas ADD COLUMN IF NOT EXISTS deal_id UUID;
    BEGIN
      ALTER TABLE lead_propuestas
        ADD CONSTRAINT lead_propuestas_deal_id_fkey
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    CREATE INDEX IF NOT EXISTS idx_lead_propuestas_deal ON lead_propuestas (deal_id);
  END IF;
END $$;

-- ─── agent_runs ────────────────────────────────────────────────
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS deal_id UUID;

DO $$ BEGIN
  ALTER TABLE agent_runs
    ADD CONSTRAINT agent_runs_deal_id_fkey
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_agent_runs_deal ON agent_runs (deal_id);

-- ─── perfiles (si existe) ──────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'perfiles'
  ) THEN
    ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS company_id UUID;
    BEGIN
      ALTER TABLE perfiles
        ADD CONSTRAINT perfiles_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    CREATE INDEX IF NOT EXISTS idx_perfiles_company_id ON perfiles (company_id);
  END IF;
END $$;
