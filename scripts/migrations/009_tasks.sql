-- ═══════════════════════════════════════════════════════════════
-- M9 — tasks (tareas manuales con vencimiento y responsable)
-- Convive con activities.type='task' (timeline). No lo modifica.
-- Requiere: users, leads, deals, contacts, companies
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  body              TEXT,
  due_at            TIMESTAMPTZ,
  done_at           TIMESTAMPTZ,
  priority          TEXT NOT NULL DEFAULT 'normal'
                    CHECK (priority IN ('low', 'normal', 'high')),
  assignee_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  lead_id           UUID REFERENCES leads(id) ON DELETE SET NULL,
  deal_id           UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id        UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id        UUID REFERENCES companies(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_open ON tasks (due_at) WHERE done_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks (assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks (lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deal ON tasks (deal_id);

DO $$ BEGIN
  CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Igual que el resto de las tablas: RLS activo, solo accede la service key del backend.
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
