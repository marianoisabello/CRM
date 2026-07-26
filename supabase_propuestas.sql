-- Agente 02 · Analista — Catálogo de propuestas + asignación lead
-- Correr en SQL Editor del proyecto hgzyfatstcjgvjmseusf
-- Fuente de verdad del catálogo: esta tabla (UI Menú + seed desde SERVICIOS_DANA)

-- ─── Catálogo de propuestas / productos ─────────────────────────
CREATE TABLE IF NOT EXISTS propuestas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  precio_min  NUMERIC(12, 2),
  precio_max  NUMERIC(12, 2),
  moneda      TEXT NOT NULL DEFAULT 'USD',
  tags        TEXT[] DEFAULT '{}',
  rubros      TEXT[] DEFAULT '{}',
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_propuestas_activo ON propuestas(activo);
CREATE INDEX IF NOT EXISTS idx_propuestas_nombre ON propuestas(nombre);

-- ─── Asignación propuesta ↔ lead/perfil ─────────────────────────
-- Junction: un lead puede tener varias; origen auto|manual
CREATE TABLE IF NOT EXISTS lead_propuestas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL REFERENCES perfiles(email) ON DELETE CASCADE,
  lead_id       UUID,
  propuesta_id  UUID NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  origen        TEXT NOT NULL DEFAULT 'manual'
                CHECK (origen IN ('auto', 'manual')),
  notas         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email, propuesta_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_propuestas_email ON lead_propuestas(email);
CREATE INDEX IF NOT EXISTS idx_lead_propuestas_lead ON lead_propuestas(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_propuestas_propuesta ON lead_propuestas(propuesta_id);

-- ─── Contexto de research en perfiles (scrape + búsqueda) ───────
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS research_context JSONB DEFAULT '{}'::jsonb;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS research_summary TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS propuesta_id UUID REFERENCES propuestas(id) ON DELETE SET NULL;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS propuesta_origen TEXT
  CHECK (propuesta_origen IS NULL OR propuesta_origen IN ('auto', 'manual'));
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS propuesta_notas TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS propuesta_asignada_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_perfiles_propuesta ON perfiles(propuesta_id);

-- ─── Seed desde SERVICIOS_DANA (idempotente por nombre) ─────────
INSERT INTO propuestas (nombre, descripcion, precio_min, precio_max, moneda, tags, rubros, activo)
SELECT v.nombre, v.descripcion, v.precio_min, v.precio_max, v.moneda, v.tags, v.rubros, true
FROM (VALUES
  (
    'Estrategia de marketing 360',
    'Plan integral de marketing: posicionamiento, canales, calendario y KPIs.',
    1500::numeric, 2500::numeric, 'USD',
    ARRAY['estrategia','mensual']::text[],
    ARRAY[]::text[]
  ),
  (
    'Gestión de redes sociales',
    'Contenido, community management y calendario editorial en redes.',
    800::numeric, 1200::numeric, 'USD',
    ARRAY['redes','mensual']::text[],
    ARRAY[]::text[]
  ),
  (
    'Performance ads (Meta + Google)',
    'Campañas de performance en Meta y Google. Fee + spend aparte.',
    1000::numeric, 2000::numeric, 'USD',
    ARRAY['ads','performance','mensual']::text[],
    ARRAY[]::text[]
  ),
  (
    'SEO y contenidos',
    'SEO on-page, contenidos y crecimiento orgánico.',
    700::numeric, 1200::numeric, 'USD',
    ARRAY['seo','contenidos','mensual']::text[],
    ARRAY[]::text[]
  ),
  (
    'Branding y rediseño',
    'Identidad visual y rediseño de marca / piezas clave. One-shot.',
    2500::numeric, 5000::numeric, 'USD',
    ARRAY['branding','one-shot']::text[],
    ARRAY[]::text[]
  )
) AS v(nombre, descripcion, precio_min, precio_max, moneda, tags, rubros)
WHERE NOT EXISTS (
  SELECT 1 FROM propuestas p WHERE p.nombre = v.nombre
);
