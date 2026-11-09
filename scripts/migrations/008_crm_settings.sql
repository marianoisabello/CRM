-- ═══════════════════════════════════════════════════════════════
-- M8 — crm_settings (clave/valor para el dashboard: objetivo del trimestre, etc.)
-- Idempotente. Aditivo: no toca tablas existentes.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS crm_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Igual que el resto de las tablas: RLS activo, solo accede la service key del backend.
ALTER TABLE crm_settings ENABLE ROW LEVEL SECURITY;
