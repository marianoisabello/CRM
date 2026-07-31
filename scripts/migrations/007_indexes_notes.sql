-- ═══════════════════════════════════════════════════════════════
-- M7 — Índices compuestos + verificación
-- Requiere: M1–M6
-- RLS: el CRM usa service role / backend JWT; no se habilita RLS
--       aquí para no romper el patrón actual. Documentado.
-- ═══════════════════════════════════════════════════════════════

-- Búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_companies_name_lower
  ON companies (LOWER(name));

CREATE INDEX IF NOT EXISTS idx_contacts_email_lower
  ON contacts (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_deals_open_stage
  ON deals (stage, updated_at DESC)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_agent_decisions_pending
  ON agent_decisions (created_at DESC)
  WHERE status = 'pending';

-- Verificación post-migración (correr manualmente y revisar counts)
-- SELECT 'companies' AS t, count(*) FROM companies
-- UNION ALL SELECT 'contacts', count(*) FROM contacts
-- UNION ALL SELECT 'pipeline_stages', count(*) FROM pipeline_stages
-- UNION ALL SELECT 'deals', count(*) FROM deals
-- UNION ALL SELECT 'activities', count(*) FROM activities
-- UNION ALL SELECT 'agent_decisions', count(*) FROM agent_decisions;

COMMENT ON TABLE companies IS 'Cuentas comerciales CRM. Independiente de clients (N clients por company).';
COMMENT ON TABLE contacts IS 'Personas CRM; pueden originarse desde leads (lead_id).';
COMMENT ON TABLE deals IS 'Oportunidades comerciales. Pipeline deals convive con leads.status Kanban.';
COMMENT ON TABLE activities IS 'Timeline unificada: humana (call/email/note/task) y agente (type=agent).';
COMMENT ON TABLE agent_decisions IS 'Bandeja IA: drafts/acciones pendientes de aprobación humana.';
COMMENT ON TABLE pipeline_stages IS 'Etapas del pipeline de deals (no afecta leads.status).';
