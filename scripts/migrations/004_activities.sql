-- ═══════════════════════════════════════════════════════════════
-- M4 — activities (humanas + agentes)
-- Requiere: deals, contacts, companies, leads, users, agent_runs
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         UUID REFERENCES deals(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  type            TEXT NOT NULL
                  CHECK (type IN ('call', 'email', 'note', 'task', 'agent')),
  title           TEXT NOT NULL,
  body            TEXT,
  author_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  agent_id        TEXT,
  agent_run_id    UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_deal ON activities (deal_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities (contact_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_company ON activities (company_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities (lead_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities (type);
CREATE INDEX IF NOT EXISTS idx_activities_occurred ON activities (occurred_at DESC);
