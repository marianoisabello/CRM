-- ═══════════════════════════════════════════════════════════════
-- M5 — agent_decisions (Bandeja IA)
-- Requiere: leads, deals, contacts, companies, users, agent_runs
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        TEXT NOT NULL,
  decision_type   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  title           TEXT NOT NULL,
  summary         TEXT,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  agent_run_id    UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  decided_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_status
  ON agent_decisions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_agent
  ON agent_decisions (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_deal ON agent_decisions (deal_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_lead ON agent_decisions (lead_id);

DO $$ BEGIN
  CREATE TRIGGER agent_decisions_updated_at
    BEFORE UPDATE ON agent_decisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
