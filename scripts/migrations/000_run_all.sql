-- ═══════════════════════════════════════════════════════════════
-- CRM Dana — Migraciones Operativa CRM (Etapa A)
-- Orden de ejecución (local / SQL Editor Supabase):
--   1. 001_companies.sql
--   2. 002_contacts.sql
--   3. 003_pipeline_stages_deals.sql
--   4. 004_activities.sql
--   5. 005_agent_decisions.sql
--   6. 006_alter_existing.sql
--   7. 007_indexes_notes.sql
--
-- Prerrequisitos: schema base (supabase_schema.sql) + función
-- update_updated_at() ya aplicada. briefings / lead_propuestas /
-- propuestas si querés los ALTER de M6 sin error.
--
-- NO aplicar en producción hasta verificación local.
-- ═══════════════════════════════════════════════════════════════

\i 001_companies.sql
\i 002_contacts.sql
\i 003_pipeline_stages_deals.sql
\i 004_activities.sql
\i 005_agent_decisions.sql
\i 006_alter_existing.sql
\i 007_indexes_notes.sql
