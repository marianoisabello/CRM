-- ═══════════════════════════════════════════════════════════════
-- Seed DEMO — Clients + Performance + Reporting
-- Solo IDs/emails demo. Idempotente.
-- Aplicar: npx supabase db query --linked -f scripts/seed-demo-performance-reporting.sql
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- Limpiar demos previos de reporting/performance/clients
DELETE FROM monthly_reports
WHERE client_id IN (
  SELECT id FROM clients WHERE company ILIKE '%[DEMO]%' OR company ILIKE 'Aura Moda%' OR company ILIKE 'PeopleOps%'
);

DELETE FROM performance_reports
WHERE client_id IN (
  SELECT id FROM clients WHERE company ILIKE '%[DEMO]%' OR company ILIKE 'Aura Moda%' OR company ILIKE 'PeopleOps%'
)
OR (client_id IS NULL AND analysis->>'data_source' = 'demo');

DELETE FROM clients
WHERE id IN (
  'd0a1c001-d000-4000-8000-000000000001',
  'd0a1c001-d000-4000-8000-000000000002'
)
OR company ILIKE '%[DEMO Pampai]%';

-- Clientes demo (lead_id solo si el lead demo existe)
INSERT INTO clients (id, lead_id, company, monthly_budget, services, status, created_at, updated_at)
VALUES
(
  'd0a1c001-d000-4000-8000-000000000001',
  (SELECT id FROM leads WHERE id = 'c0a1e001-d000-4000-8000-000000000001'),
  'Aura Moda [DEMO Pampai]',
  8000,
  ARRAY['Performance ads Meta + Google', 'Creatividades UGC'],
  'active',
  NOW() - INTERVAL '45 days',
  NOW()
),
(
  'd0a1c001-d000-4000-8000-000000000002',
  (SELECT id FROM leads WHERE id = 'c0a1e001-d000-4000-8000-000000000002'),
  'PeopleOps Cloud [DEMO Pampai]',
  4500,
  ARRAY['Estrategia 360', 'LinkedIn + contenidos'],
  'active',
  NOW() - INTERVAL '60 days',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  monthly_budget = EXCLUDED.monthly_budget,
  services = EXCLUDED.services,
  status = 'active',
  updated_at = NOW();

-- Marcar leads demo como won (opcional, no rompe pipeline)
UPDATE leads
SET status = 'won', updated_at = NOW()
WHERE id IN (
  'c0a1e001-d000-4000-8000-000000000001',
  'c0a1e001-d000-4000-8000-000000000002'
);

-- Performance report demo (pending approval)
INSERT INTO performance_reports (
  id, client_id, period_since, period_until, analysis, actions_pending_approval, status, created_at
) VALUES (
  'e0a1f001-d000-4000-8000-000000000001',
  'd0a1c001-d000-4000-8000-000000000001',
  (CURRENT_DATE - INTERVAL '8 days')::date,
  (CURRENT_DATE - INTERVAL '1 day')::date,
  jsonb_build_object(
    'period', to_char(CURRENT_DATE - INTERVAL '8 days', 'YYYY-MM-DD') || ' / ' || to_char(CURRENT_DATE - INTERVAL '1 day', 'YYYY-MM-DD'),
    'summary', '[DEMO] Meta Prospecting estable; Retargeting con buen ROAS. Google Competitor con CPC alto y conversiones bajas.',
    'alerts', jsonb_build_array(
      jsonb_build_object('campaign', '[DEMO] Google · Competitor', 'issue', 'CPC elevado / ROAS bajo', 'severity', 'alta')
    ),
    'recommendations', jsonb_build_array(
      jsonb_build_object('action', 'Recortar budget Competitor 30%', 'campaign', '[DEMO] Google · Competitor', 'expected_impact', 'Bajar CPA', 'requires_approval', true),
      jsonb_build_object('action', 'Escalar Retargeting 20%', 'campaign', '[DEMO] Meta · Retargeting 30d', 'expected_impact', 'Más compras', 'requires_approval', false)
    ),
    'actions_pending_approval', jsonb_build_array('Pausar o recortar Google Competitor', 'Reasignar $150 a Meta Retargeting'),
    'data_source', 'demo'
  ),
  '["Pausar o recortar Google Competitor", "Reasignar $150 a Meta Retargeting"]'::jsonb,
  'pending_approval',
  NOW() - INTERVAL '2 hours'
)
ON CONFLICT (id) DO UPDATE SET
  analysis = EXCLUDED.analysis,
  actions_pending_approval = EXCLUDED.actions_pending_approval,
  status = 'pending_approval',
  period_since = EXCLUDED.period_since,
  period_until = EXCLUDED.period_until;

-- Monthly report demo
INSERT INTO monthly_reports (id, client_id, month, report, status, created_at)
VALUES (
  'f0a1a001-d000-4000-8000-000000000001',
  'd0a1c001-d000-4000-8000-000000000001',
  to_char(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'),
  jsonb_build_object(
    'period', to_char(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'),
    'headline', '[DEMO] ROAS Meta +18% vs mes anterior; Google Search aporta demos estables',
    'key_metrics', jsonb_build_array(
      jsonb_build_object('metric', 'ROAS Meta', 'value', '2.4x', 'vs_previous', '+18%', 'highlight', true),
      jsonb_build_object('metric', 'Spend total', 'value', 'USD 7.2k', 'vs_previous', '+8%', 'highlight', false),
      jsonb_build_object('metric', 'Leads calificados', 'value', '14', 'vs_previous', '+3', 'highlight', true)
    ),
    'wins', jsonb_build_array('Creatividades UGC top 3 en Retargeting', 'CPA compra -12% en Lookalike'),
    'explanations', jsonb_build_array('El alza de ROAS viene de frezar creativos fatigosos y reforzar retargeting 7-30d.'),
    'next_month_plan', jsonb_build_array('Testear 8 UGC nuevos', 'Recortar Competitor Search', 'Abrir catalog ads'),
    'report_ready_to_send', true
  ),
  'pending_approval',
  NOW() - INTERVAL '1 day'
)
ON CONFLICT (client_id, month) DO UPDATE SET
  report = EXCLUDED.report,
  status = 'pending_approval';

COMMIT;

SELECT 'clients' AS tabla, count(*)::int AS n FROM clients WHERE company ILIKE '%[DEMO Pampai]%'
UNION ALL SELECT 'performance_reports', count(*)::int FROM performance_reports WHERE analysis->>'data_source' = 'demo'
UNION ALL SELECT 'monthly_reports', count(*)::int FROM monthly_reports WHERE report->>'headline' ILIKE '%[DEMO]%';
