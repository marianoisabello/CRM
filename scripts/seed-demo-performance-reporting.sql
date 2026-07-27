-- ═══════════════════════════════════════════════════════════════
-- Seed DEMO — Clients + Performance + Reporting (rico)
-- Solo IDs/empresas [DEMO Pampai]. Idempotente.
-- Proyecto: hgzyfatstcjgvjmseusf
-- Aplicar: npx supabase db query --linked -f scripts/seed-demo-performance-reporting.sql
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- Limpiar demos previos de reporting/performance/clients (solo DEMO)
DELETE FROM monthly_reports
WHERE client_id IN (
  SELECT id FROM clients
  WHERE company ILIKE '%[DEMO Pampai]%'
     OR id IN (
       'd0a1c001-d000-4000-8000-000000000001',
       'd0a1c001-d000-4000-8000-000000000002',
       'd0a1c001-d000-4000-8000-000000000003',
       'd0a1c001-d000-4000-8000-000000000004',
       'd0a1c001-d000-4000-8000-000000000005'
     )
);

DELETE FROM performance_reports
WHERE client_id IN (
  SELECT id FROM clients
  WHERE company ILIKE '%[DEMO Pampai]%'
     OR id IN (
       'd0a1c001-d000-4000-8000-000000000001',
       'd0a1c001-d000-4000-8000-000000000002',
       'd0a1c001-d000-4000-8000-000000000003',
       'd0a1c001-d000-4000-8000-000000000004',
       'd0a1c001-d000-4000-8000-000000000005'
     )
)
OR id IN (
  'e0a1f001-d000-4000-8000-000000000001',
  'e0a1f001-d000-4000-8000-000000000002',
  'e0a1f001-d000-4000-8000-000000000003',
  'e0a1f001-d000-4000-8000-000000000004',
  'e0a1f001-d000-4000-8000-000000000005',
  'e0a1f001-d000-4000-8000-000000000006',
  'e0a1f001-d000-4000-8000-000000000007',
  'e0a1f001-d000-4000-8000-000000000008'
)
OR (client_id IS NULL AND analysis->>'data_source' = 'demo');

DELETE FROM clients
WHERE id IN (
  'd0a1c001-d000-4000-8000-000000000001',
  'd0a1c001-d000-4000-8000-000000000002',
  'd0a1c001-d000-4000-8000-000000000003',
  'd0a1c001-d000-4000-8000-000000000004',
  'd0a1c001-d000-4000-8000-000000000005'
)
OR company ILIKE '%[DEMO Pampai]%';

-- ─── Clientes demo (5) — lead_id solo si el lead demo existe ───
INSERT INTO clients (id, lead_id, company, monthly_budget, services, status, created_at, updated_at)
VALUES
(
  'd0a1c001-d000-4000-8000-000000000001',
  (SELECT id FROM leads WHERE id = 'c0a1e001-d000-4000-8000-000000000001'),
  'Aura Moda [DEMO Pampai]',
  8000,
  ARRAY['Performance ads Meta + Google', 'Creatividades UGC'],
  'active',
  NOW() - INTERVAL '90 days',
  NOW()
),
(
  'd0a1c001-d000-4000-8000-000000000002',
  (SELECT id FROM leads WHERE id = 'c0a1e001-d000-4000-8000-000000000002'),
  'PeopleOps Cloud [DEMO Pampai]',
  4500,
  ARRAY['Estrategia 360', 'LinkedIn + contenidos'],
  'active',
  NOW() - INTERVAL '75 days',
  NOW()
),
(
  'd0a1c001-d000-4000-8000-000000000003',
  (SELECT id FROM leads WHERE id = 'c0a1e001-d000-4000-8000-000000000003'),
  'Clínica Sonrisa Norte [DEMO Pampai]',
  3200,
  ARRAY['Google Ads Local', 'Meta leads clínicas'],
  'active',
  NOW() - INTERVAL '60 days',
  NOW()
),
(
  'd0a1c001-d000-4000-8000-000000000004',
  (SELECT id FROM leads WHERE id = 'c0a1e001-d000-4000-8000-000000000005'),
  'NexaPay [DEMO Pampai]',
  12000,
  ARRAY['Performance acquisition', 'Creative testing'],
  'active',
  NOW() - INTERVAL '40 days',
  NOW()
),
(
  'd0a1c001-d000-4000-8000-000000000005',
  (SELECT id FROM leads WHERE id = 'c0a1e001-d000-4000-8000-000000000007'),
  'AulaViva [DEMO Pampai]',
  5500,
  ARRAY['Funnel dual B2B/B2C', 'Contenido + paid'],
  'paused',
  NOW() - INTERVAL '120 days',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  monthly_budget = EXCLUDED.monthly_budget,
  services = EXCLUDED.services,
  status = EXCLUDED.status,
  lead_id = EXCLUDED.lead_id,
  updated_at = NOW();

-- Marcar leads demo asociados como won (no rompe pipeline)
UPDATE leads
SET status = 'won', updated_at = NOW()
WHERE id IN (
  'c0a1e001-d000-4000-8000-000000000001',
  'c0a1e001-d000-4000-8000-000000000002',
  'c0a1e001-d000-4000-8000-000000000003',
  'c0a1e001-d000-4000-8000-000000000005',
  'c0a1e001-d000-4000-8000-000000000007'
);

-- ═══════════════════════════════════════════════════════════════
-- Performance reports (8) — multi-canal + alerts por canal
-- Canales: meta_ads, google_ads, linkedin_ads, tiktok_ads, ga4,
--          instagram_organic, whatsapp
-- status: pending_approval | approved | done
-- ═══════════════════════════════════════════════════════════════

INSERT INTO performance_reports (
  id, client_id, period_since, period_until, analysis, actions_pending_approval, status, approved_at, created_at
) VALUES
-- 1 Aura — semana reciente, pending (mix full)
(
  'e0a1f001-d000-4000-8000-000000000001',
  'd0a1c001-d000-4000-8000-000000000001',
  (CURRENT_DATE - INTERVAL '8 days')::date,
  (CURRENT_DATE - INTERVAL '1 day')::date,
  jsonb_build_object(
    'period', to_char(CURRENT_DATE - INTERVAL '8 days', 'YYYY-MM-DD') || ' / ' || to_char(CURRENT_DATE - INTERVAL '1 day', 'YYYY-MM-DD'),
    'summary', '[DEMO] Meta Prospecting estable; Retargeting ROAS ~3.1x. Google Competitor CPC alto. TikTok Spark aporta volumen barato. GA4 orgánico +12% sesiones. IG reach 48k. WhatsApp response rate 86%.',
    'channels_analyzed', jsonb_build_array('meta_ads','google_ads','linkedin_ads','tiktok_ads','ga4','instagram_organic','whatsapp'),
    'channel_breakdown', jsonb_build_array(
      jsonb_build_object('channel','meta_ads','label','Meta Ads','highlight','Retargeting lidera ROAS','severity','ok'),
      jsonb_build_object('channel','google_ads','label','Google Ads','highlight','Competitor lastra mix','severity','critical'),
      jsonb_build_object('channel','linkedin_ads','label','LinkedIn Ads','highlight','Sin spend relevante esta semana','severity','ok'),
      jsonb_build_object('channel','tiktok_ads','label','TikTok Ads','highlight','Spark CTR 3.5% saludable','severity','ok'),
      jsonb_build_object('channel','ga4','label','Google Analytics (orgánico)','highlight','Sesiones orgánicas +12% WoW','severity','ok'),
      jsonb_build_object('channel','instagram_organic','label','Instagram orgánico','highlight','Engagement rate 8.4%','severity','ok'),
      jsonb_build_object('channel','whatsapp','label','WhatsApp','highlight','Response rate 86%','severity','ok')
    ),
    'alerts', jsonb_build_array(
      jsonb_build_object('channel','google_ads','campaign','[DEMO] Google · Competitor','issue','CPC elevado / ROAS bajo (~0.7x)','severity','alta'),
      jsonb_build_object('channel','meta_ads','campaign','[DEMO] Meta · Prospecting Lookalike','issue','Frecuencia >3.2 en creative principal','severity','media')
    ),
    'recommendations', jsonb_build_array(
      jsonb_build_object('action','Recortar budget Competitor 30%','channel','google_ads','campaign','[DEMO] Google · Competitor','expected_impact','Bajar CPA ~15%','requires_approval',true),
      jsonb_build_object('action','Escalar Retargeting 20%','channel','meta_ads','campaign','[DEMO] Meta · Retargeting 30d','expected_impact','Más compras a CPA estable','requires_approval',false),
      jsonb_build_object('action','Duplicar Spark Ads winner','channel','tiktok_ads','campaign','[DEMO] TikTok · Spark Ads Prospecting','expected_impact','+volumen a CPC bajo','requires_approval',false)
    ),
    'actions_pending_approval', jsonb_build_array('Pausar o recortar Google Competitor','Reasignar $150 a Meta Retargeting'),
    'metrics_snapshot', jsonb_build_object(
      'meta_ads', jsonb_build_array(
        jsonb_build_object('campaign_name','[DEMO] Meta · Prospecting Lookalike','impressions',84200,'clicks',2105,'spend',1250.4,'ctr',2.5,'cpc',0.59,'purchases',38),
        jsonb_build_object('campaign_name','[DEMO] Meta · Retargeting 30d','impressions',22100,'clicks',980,'spend',420.0,'ctr',4.4,'cpc',0.43,'purchases',52)
      ),
      'google_ads', jsonb_build_array(
        jsonb_build_object('campaign','[DEMO] Google · Brand Search','impressions',15400,'clicks',1120,'cost',380.5,'conversions',41,'ctr',7.27),
        jsonb_build_object('campaign','[DEMO] Google · Competitor','impressions',9800,'clicks',210,'cost',510.0,'conversions',6,'ctr',2.14)
      ),
      'linkedin_ads', jsonb_build_array(),
      'tiktok_ads', jsonb_build_array(
        jsonb_build_object('campaign','[DEMO] TikTok · Spark Ads Prospecting','impressions',195000,'clicks',6825,'spend',980.0,'ctr',3.5,'conversions',42)
      ),
      'ga4', jsonb_build_array(
        jsonb_build_object('source','organic','sessions',12480,'users',9320,'conversions',86,'bounce_rate',0.41)
      ),
      'instagram_organic', jsonb_build_array(
        jsonb_build_object('metric','reach','value',48200,'posts',12),
        jsonb_build_object('metric','engagement','likes',3120,'comments',248,'saves',610,'engagement_rate',8.4)
      ),
      'whatsapp', jsonb_build_array(
        jsonb_build_object('conversations_started',312,'conversations_replied',268,'response_rate',0.859,'median_first_response_min',4.2)
      )
    ),
    'data_source', 'demo'
  ),
  '["Pausar o recortar Google Competitor", "Reasignar $150 a Meta Retargeting"]'::jsonb,
  'pending_approval',
  NULL,
  NOW() - INTERVAL '2 hours'
),
-- 2 Aura — semana anterior, approved
(
  'e0a1f001-d000-4000-8000-000000000002',
  'd0a1c001-d000-4000-8000-000000000001',
  (CURRENT_DATE - INTERVAL '15 days')::date,
  (CURRENT_DATE - INTERVAL '9 days')::date,
  jsonb_build_object(
    'period', to_char(CURRENT_DATE - INTERVAL '15 days', 'YYYY-MM-DD') || ' / ' || to_char(CURRENT_DATE - INTERVAL '9 days', 'YYYY-MM-DD'),
    'summary', '[DEMO] Semana estable: Brand Search 68% conv Google. Meta Catalog test CTR 3.1%. GA4 direct estable. IG saves +18%.',
    'channels_analyzed', jsonb_build_array('meta_ads','google_ads','ga4','instagram_organic'),
    'channel_breakdown', jsonb_build_array(
      jsonb_build_object('channel','meta_ads','label','Meta Ads','highlight','Catalog test en rampa','severity','watch'),
      jsonb_build_object('channel','google_ads','label','Google Ads','highlight','Brand concentra conversiones','severity','ok'),
      jsonb_build_object('channel','ga4','label','Google Analytics (orgánico)','highlight','Direct estable','severity','ok'),
      jsonb_build_object('channel','instagram_organic','label','Instagram orgánico','highlight','Saves +18%','severity','ok')
    ),
    'alerts', jsonb_build_array(
      jsonb_build_object('channel','meta_ads','campaign','[DEMO] Meta · Catalog Test','issue','Volumen bajo (<10 compras) — datos aún no concluyentes','severity','baja')
    ),
    'recommendations', jsonb_build_array(
      jsonb_build_object('action','Mantener Brand Search budget','channel','google_ads','campaign','[DEMO] Google · Brand Search','expected_impact','Proteger ROAS base','requires_approval',false),
      jsonb_build_object('action','Subir budget Catalog +$80/día por 7 días','channel','meta_ads','campaign','[DEMO] Meta · Catalog Test','expected_impact','Llegar a n estadístico','requires_approval',true)
    ),
    'actions_pending_approval', jsonb_build_array(),
    'metrics_snapshot', jsonb_build_object(
      'meta_ads', jsonb_build_array(jsonb_build_object('campaign_name','[DEMO] Meta · Catalog Test','impressions',9800,'clicks',304,'spend',210.0,'ctr',3.1,'purchases',8)),
      'google_ads', jsonb_build_array(jsonb_build_object('campaign','[DEMO] Google · Brand Search','impressions',14200,'clicks',1050,'cost',360.0,'conversions',38,'ctr',7.4)),
      'ga4', jsonb_build_array(jsonb_build_object('source','direct','sessions',4100,'users',3800,'conversions',24)),
      'instagram_organic', jsonb_build_array(jsonb_build_object('metric','engagement','saves',520,'engagement_rate',7.9))
    ),
    'data_source', 'demo'
  ),
  '[]'::jsonb,
  'approved',
  NOW() - INTERVAL '6 days',
  NOW() - INTERVAL '7 days'
),
-- 3 PeopleOps — pending (LinkedIn + Google + WhatsApp)
(
  'e0a1f001-d000-4000-8000-000000000003',
  'd0a1c001-d000-4000-8000-000000000002',
  (CURRENT_DATE - INTERVAL '8 days')::date,
  (CURRENT_DATE - INTERVAL '1 day')::date,
  jsonb_build_object(
    'period', to_char(CURRENT_DATE - INTERVAL '8 days', 'YYYY-MM-DD') || ' / ' || to_char(CURRENT_DATE - INTERVAL '1 day', 'YYYY-MM-DD'),
    'summary', '[DEMO] Google Demand Gen demos CPA $86. LinkedIn TL CPL alto. Lead Gen Form OK. WhatsApp B2B response 79%.',
    'channels_analyzed', jsonb_build_array('google_ads','linkedin_ads','whatsapp','ga4'),
    'channel_breakdown', jsonb_build_array(
      jsonb_build_object('channel','google_ads','label','Google Ads','highlight','Demand Gen aporta volumen útil','severity','ok'),
      jsonb_build_object('channel','linkedin_ads','label','LinkedIn Ads','highlight','TL no justifica CPL','severity','critical'),
      jsonb_build_object('channel','whatsapp','label','WhatsApp','highlight','Response 79% en demos','severity','watch'),
      jsonb_build_object('channel','ga4','label','Google Analytics (orgánico)','highlight','Landing /pricing bounce 58%','severity','watch')
    ),
    'alerts', jsonb_build_array(
      jsonb_build_object('channel','linkedin_ads','campaign','[DEMO] LinkedIn · Thought Leadership','issue','CPL $210 vs meta $90','severity','alta'),
      jsonb_build_object('channel','google_ads','campaign','[DEMO] Google · Competitor Keywords','issue','Quality Score 3-4 en 40% keywords','severity','media'),
      jsonb_build_object('channel','whatsapp','campaign','Inbox demos','issue','Median first response 11 min (meta <5)','severity','media')
    ),
    'recommendations', jsonb_build_array(
      jsonb_build_object('action','Pausar LinkedIn Thought Leadership','channel','linkedin_ads','campaign','[DEMO] LinkedIn · Thought Leadership','expected_impact','Liberar $600/sem a Demand Gen','requires_approval',true),
      jsonb_build_object('action','Negativos agresivos en Competitor','channel','google_ads','campaign','[DEMO] Google · Competitor Keywords','expected_impact','Bajar CPC 12-18%','requires_approval',false)
    ),
    'actions_pending_approval', jsonb_build_array('Pausar LinkedIn Thought Leadership','Reasignar $600/semana a Google Demand Gen'),
    'metrics_snapshot', jsonb_build_object(
      'google_ads', jsonb_build_array(
        jsonb_build_object('campaign','[DEMO] Google · Demand Gen SaaS','impressions',42000,'clicks',980,'cost',1680.0,'conversions',19.5,'ctr',2.33),
        jsonb_build_object('campaign','[DEMO] Google · Brand Search','impressions',6100,'clicks',720,'cost',290.0,'conversions',14,'ctr',11.8)
      ),
      'linkedin_ads', jsonb_build_array(
        jsonb_build_object('campaign','[DEMO] LinkedIn · Thought Leadership','impressions',28500,'clicks',114,'spend',890.0,'ctr',0.4,'leads',4,'cpl',222.5),
        jsonb_build_object('campaign','[DEMO] LinkedIn · Lead Gen Form SaaS','impressions',12400,'clicks',186,'spend',620.0,'ctr',1.5,'leads',11,'cpl',56.4)
      ),
      'whatsapp', jsonb_build_array(jsonb_build_object('conversations_started',94,'conversations_replied',74,'response_rate',0.787,'median_first_response_min',11.0)),
      'ga4', jsonb_build_array(jsonb_build_object('source','organic','sessions',3200,'bounce_rate',0.58,'conversions',12))
    ),
    'data_source', 'demo'
  ),
  '["Pausar LinkedIn Thought Leadership", "Reasignar $600/semana a Google Demand Gen"]'::jsonb,
  'pending_approval',
  NULL,
  NOW() - INTERVAL '5 hours'
),
-- 4 Clínica — approved (Meta + Google + IG + WA)
(
  'e0a1f001-d000-4000-8000-000000000004',
  'd0a1c001-d000-4000-8000-000000000003',
  (CURRENT_DATE - INTERVAL '8 days')::date,
  (CURRENT_DATE - INTERVAL '1 day')::date,
  jsonb_build_object(
    'period', to_char(CURRENT_DATE - INTERVAL '8 days', 'YYYY-MM-DD') || ' / ' || to_char(CURRENT_DATE - INTERVAL '1 day', 'YYYY-MM-DD'),
    'summary', '[DEMO] Google Local + Search: 47 turnos. Meta Lead Ads CPL $11.2. IG Reels reach fuerte. WhatsApp confirma turnos a 91% response.',
    'channels_analyzed', jsonb_build_array('meta_ads','google_ads','instagram_organic','whatsapp'),
    'channel_breakdown', jsonb_build_array(
      jsonb_build_object('channel','meta_ads','label','Meta Ads','highlight','CPL bajo meta','severity','ok'),
      jsonb_build_object('channel','google_ads','label','Google Ads','highlight','Pico jue-sáb','severity','ok'),
      jsonb_build_object('channel','instagram_organic','label','Instagram orgánico','highlight','Reels drive reach','severity','ok'),
      jsonb_build_object('channel','whatsapp','label','WhatsApp','highlight','Confirmación turnos 91%','severity','ok')
    ),
    'alerts', jsonb_build_array(
      jsonb_build_object('channel','meta_ads','campaign','[DEMO] Meta · Lead Ads Ortodoncia','issue','Form completion rate bajó a 38% (-9pp)','severity','media')
    ),
    'recommendations', jsonb_build_array(
      jsonb_build_object('action','Acortar form a 3 campos','channel','meta_ads','campaign','[DEMO] Meta · Lead Ads Ortodoncia','expected_impact','Subir completion a ~50%','requires_approval',false),
      jsonb_build_object('action','Dayparting Search: +20% jue-sáb','channel','google_ads','campaign','[DEMO] Google · Local Search','expected_impact','+8-12 turnos/sem','requires_approval',true)
    ),
    'actions_pending_approval', jsonb_build_array(),
    'metrics_snapshot', jsonb_build_object(
      'meta_ads', jsonb_build_array(jsonb_build_object('campaign_name','[DEMO] Meta · Lead Ads Ortodoncia','impressions',38000,'clicks',1520,'spend',510.0,'leads',45,'cpl',11.2)),
      'google_ads', jsonb_build_array(jsonb_build_object('campaign','[DEMO] Google · Local Search','impressions',9200,'clicks',640,'cost',780.0,'conversions',47)),
      'instagram_organic', jsonb_build_array(jsonb_build_object('metric','reach','value',28600,'posts',8,'engagement_rate',6.2)),
      'whatsapp', jsonb_build_array(jsonb_build_object('conversations_started',120,'conversations_replied',109,'response_rate',0.908))
    ),
    'data_source', 'demo'
  ),
  '[]'::jsonb,
  'approved',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '2 days'
),
-- 5 NexaPay — pending (fintech: Meta + Google + TikTok)
(
  'e0a1f001-d000-4000-8000-000000000005',
  'd0a1c001-d000-4000-8000-000000000004',
  (CURRENT_DATE - INTERVAL '8 days')::date,
  (CURRENT_DATE - INTERVAL '1 day')::date,
  jsonb_build_object(
    'period', to_char(CURRENT_DATE - INTERVAL '8 days', 'YYYY-MM-DD') || ' / ' || to_char(CURRENT_DATE - INTERVAL '1 day', 'YYYY-MM-DD'),
    'summary', '[DEMO] Meta App CPI $1.85. Google UAC barato pero D1 18%. TikTok Spark installs mid-funnel. GA4 in-app events limpios.',
    'channels_analyzed', jsonb_build_array('meta_ads','google_ads','tiktok_ads','ga4'),
    'channel_breakdown', jsonb_build_array(
      jsonb_build_object('channel','meta_ads','label','Meta Ads','highlight','Mejor cohort quality','severity','ok'),
      jsonb_build_object('channel','google_ads','label','Google Ads','highlight','UAC calidad dudosa','severity','critical'),
      jsonb_build_object('channel','tiktok_ads','label','TikTok Ads','highlight','Volumen mid CPI','severity','watch'),
      jsonb_build_object('channel','ga4','label','Google Analytics (orgánico)','highlight','Eventos in-app OK','severity','ok')
    ),
    'alerts', jsonb_build_array(
      jsonb_build_object('channel','google_ads','campaign','[DEMO] Google · UAC Installs','issue','Retención D1 baja / calidad dudosa','severity','alta'),
      jsonb_build_object('channel','meta_ads','campaign','[DEMO] Meta · Advantage+ App','issue','Spend limitado por learning phase en 2 adsets','severity','media')
    ),
    'recommendations', jsonb_build_array(
      jsonb_build_object('action','Recortar UAC 40% y mover a Meta A+','channel','google_ads','campaign','[DEMO] Google · UAC Installs','expected_impact','Mejor cohort quality','requires_approval',true),
      jsonb_build_object('action','Consolidad 2 adsets en learning','channel','meta_ads','campaign','[DEMO] Meta · Advantage+ App','expected_impact','Salir de learning más rápido','requires_approval',true)
    ),
    'actions_pending_approval', jsonb_build_array('Recortar Google UAC 40%','Consolidar adsets Meta Advantage+'),
    'metrics_snapshot', jsonb_build_object(
      'meta_ads', jsonb_build_array(jsonb_build_object('campaign_name','[DEMO] Meta · Advantage+ App','impressions',210000,'clicks',8400,'spend',3100.0,'installs',1675,'cpi',1.85)),
      'google_ads', jsonb_build_array(jsonb_build_object('campaign','[DEMO] Google · UAC Installs','impressions',180000,'clicks',5200,'cost',2200.0,'conversions',1900,'cpi',1.16)),
      'tiktok_ads', jsonb_build_array(jsonb_build_object('campaign','[DEMO] TikTok · App Install Spark','impressions',150000,'clicks',4500,'spend',1400.0,'installs',820,'cpi',1.71)),
      'ga4', jsonb_build_array(jsonb_build_object('source','app','sessions',22000,'conversions',4100))
    ),
    'data_source', 'demo'
  ),
  '["Recortar Google UAC 40%", "Consolidar adsets Meta Advantage+"]'::jsonb,
  'pending_approval',
  NULL,
  NOW() - INTERVAL '8 hours'
),
-- 6 AulaViva — done (histórico)
(
  'e0a1f001-d000-4000-8000-000000000006',
  'd0a1c001-d000-4000-8000-000000000005',
  (CURRENT_DATE - INTERVAL '45 days')::date,
  (CURRENT_DATE - INTERVAL '38 days')::date,
  jsonb_build_object(
    'period', to_char(CURRENT_DATE - INTERVAL '45 days', 'YYYY-MM-DD') || ' / ' || to_char(CURRENT_DATE - INTERVAL '38 days', 'YYYY-MM-DD'),
    'summary', '[DEMO] Última semana activa: B2B Search CPA $142; B2C Meta CPL $9.8 calidad baja. Reactivar solo B2B.',
    'channels_analyzed', jsonb_build_array('meta_ads','google_ads'),
    'channel_breakdown', jsonb_build_array(
      jsonb_build_object('channel','meta_ads','label','Meta Ads','highlight','B2C calidad baja','severity','critical'),
      jsonb_build_object('channel','google_ads','label','Google Ads','highlight','B2B viable','severity','ok')
    ),
    'alerts', jsonb_build_array(
      jsonb_build_object('channel','meta_ads','campaign','[DEMO] Meta · Padres B2C','issue','Lead quality baja (show-rate demo 11%)','severity','alta')
    ),
    'recommendations', jsonb_build_array(
      jsonb_build_object('action','Mantener pausa B2C hasta nuevo offer','channel','meta_ads','campaign','[DEMO] Meta · Padres B2C','expected_impact','Evitar burn','requires_approval',false)
    ),
    'actions_pending_approval', jsonb_build_array(),
    'metrics_snapshot', jsonb_build_object(
      'meta_ads', jsonb_build_array(jsonb_build_object('campaign_name','[DEMO] Meta · Padres B2C','spend',980.0,'leads',100,'cpl',9.8)),
      'google_ads', jsonb_build_array(jsonb_build_object('campaign','[DEMO] Google · B2B Search','cost',1980.0,'conversions',14,'cpa',141.4))
    ),
    'data_source', 'demo'
  ),
  '[]'::jsonb,
  'done',
  NULL,
  NOW() - INTERVAL '35 days'
),
-- 7 Global/account-level — pending (todos los canales)
(
  'e0a1f001-d000-4000-8000-000000000007',
  NULL,
  (CURRENT_DATE - INTERVAL '8 days')::date,
  (CURRENT_DATE - INTERVAL '1 day')::date,
  jsonb_build_object(
    'period', to_char(CURRENT_DATE - INTERVAL '8 days', 'YYYY-MM-DD') || ' / ' || to_char(CURRENT_DATE - INTERVAL '1 day', 'YYYY-MM-DD'),
    'summary', '[DEMO] Vista agencia multi-canal: spend paid ~$12.1k (−3% WoW). Alertas en Competitor Search y LinkedIn TL. Mejor pool: Meta Retargeting + TikTok Spark. Orgánico y WA estables.',
    'channels_analyzed', jsonb_build_array('meta_ads','google_ads','linkedin_ads','tiktok_ads','ga4','instagram_organic','whatsapp'),
    'channel_breakdown', jsonb_build_array(
      jsonb_build_object('channel','meta_ads','label','Meta Ads','highlight','Mejor ROAS pool','severity','ok'),
      jsonb_build_object('channel','google_ads','label','Google Ads','highlight','Competitor waste cross-client','severity','critical'),
      jsonb_build_object('channel','linkedin_ads','label','LinkedIn Ads','highlight','TL underperform','severity','critical'),
      jsonb_build_object('channel','tiktok_ads','label','TikTok Ads','highlight','CPC competitivo','severity','ok'),
      jsonb_build_object('channel','ga4','label','Google Analytics (orgánico)','highlight','Sesiones +8%','severity','ok'),
      jsonb_build_object('channel','instagram_organic','label','Instagram orgánico','highlight','Reach agregado 120k','severity','ok'),
      jsonb_build_object('channel','whatsapp','label','WhatsApp','highlight','Response blended 84%','severity','ok')
    ),
    'alerts', jsonb_build_array(
      jsonb_build_object('channel','google_ads','campaign','[DEMO] Cross-client · Competitor Search','issue','3 clientes con ROAS <1.0 en competitor','severity','alta'),
      jsonb_build_object('channel','linkedin_ads','campaign','Thought Leadership pool','issue','CPL agregado fuera de meta','severity','alta')
    ),
    'recommendations', jsonb_build_array(
      jsonb_build_object('action','Playbook: cap Competitor al 15% del search budget','channel','google_ads','campaign','Account','expected_impact','Reducir waste ~$800/sem','requires_approval',true)
    ),
    'actions_pending_approval', jsonb_build_array('Aprobar playbook Competitor 15% cap para todos los clientes DEMO'),
    'metrics_snapshot', jsonb_build_object(
      'meta_ads', jsonb_build_array(jsonb_build_object('note','rollup','spend',5200)),
      'google_ads', jsonb_build_array(jsonb_build_object('note','rollup','cost',4100)),
      'linkedin_ads', jsonb_build_array(jsonb_build_object('note','rollup','spend',1500)),
      'tiktok_ads', jsonb_build_array(jsonb_build_object('note','rollup','spend',1300)),
      'ga4', jsonb_build_array(jsonb_build_object('sessions',28000)),
      'instagram_organic', jsonb_build_array(jsonb_build_object('reach',120000)),
      'whatsapp', jsonb_build_array(jsonb_build_object('conversations_started',620,'response_rate',0.84))
    ),
    'data_source', 'demo'
  ),
  '["Aprobar playbook Competitor 15% cap para todos los clientes DEMO"]'::jsonb,
  'pending_approval',
  NULL,
  NOW() - INTERVAL '3 hours'
),
-- 8 NexaPay — semana previa approved
(
  'e0a1f001-d000-4000-8000-000000000008',
  'd0a1c001-d000-4000-8000-000000000004',
  (CURRENT_DATE - INTERVAL '15 days')::date,
  (CURRENT_DATE - INTERVAL '9 days')::date,
  jsonb_build_object(
    'period', to_char(CURRENT_DATE - INTERVAL '15 days', 'YYYY-MM-DD') || ' / ' || to_char(CURRENT_DATE - INTERVAL '9 days', 'YYYY-MM-DD'),
    'summary', '[DEMO] Creative test: UGC fintech #3 +34% CTR. Se aprobó escalar a 60% budget Meta. TikTok mirror creativo pendiente.',
    'channels_analyzed', jsonb_build_array('meta_ads','tiktok_ads'),
    'channel_breakdown', jsonb_build_array(
      jsonb_build_object('channel','meta_ads','label','Meta Ads','highlight','UGC #3 winner','severity','ok'),
      jsonb_build_object('channel','tiktok_ads','label','TikTok Ads','highlight','Mirror creativo pendiente','severity','watch')
    ),
    'alerts', jsonb_build_array(),
    'recommendations', jsonb_build_array(
      jsonb_build_object('action','Escalar UGC #3 a 60% budget','channel','meta_ads','campaign','[DEMO] Meta · Advantage+ App','expected_impact','Bajar CPI a ~$1.60','requires_approval',true)
    ),
    'actions_pending_approval', jsonb_build_array(),
    'metrics_snapshot', jsonb_build_object(
      'meta_ads', jsonb_build_array(jsonb_build_object('campaign_name','[DEMO] Meta · Advantage+ App','spend',2800.0,'installs',1500,'cpi',1.87)),
      'tiktok_ads', jsonb_build_array(jsonb_build_object('campaign','[DEMO] TikTok · Creative Mirror','spend',400.0,'installs',180))
    ),
    'data_source', 'demo'
  ),
  '[]'::jsonb,
  'approved',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '9 days'
)
ON CONFLICT (id) DO UPDATE SET
  client_id = EXCLUDED.client_id,
  period_since = EXCLUDED.period_since,
  period_until = EXCLUDED.period_until,
  analysis = EXCLUDED.analysis,
  actions_pending_approval = EXCLUDED.actions_pending_approval,
  status = EXCLUDED.status,
  approved_at = EXCLUDED.approved_at,
  created_at = EXCLUDED.created_at;

-- ═══════════════════════════════════════════════════════════════
-- Monthly reports (6) — statuses pending_approval | approved | sent
-- unique (client_id, month)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO monthly_reports (id, client_id, month, report, status, approved_at, created_at)
VALUES
-- Aura mes anterior — pending
(
  'f0a1a001-d000-4000-8000-000000000001',
  'd0a1c001-d000-4000-8000-000000000001',
  to_char(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'),
  jsonb_build_object(
    'period', to_char(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'),
    'headline', '[DEMO] ROAS Meta +18% vs mes anterior; mix multi-canal (TikTok + orgánico + WA) aportó estabilidad',
    'key_metrics', jsonb_build_array(
      jsonb_build_object('metric', 'ROAS Meta', 'value', '2.4x', 'vs_previous', '+18%', 'highlight', true, 'channel', 'meta_ads'),
      jsonb_build_object('metric', 'Spend paid total', 'value', 'USD 7.2k', 'vs_previous', '+8%', 'highlight', false, 'channel', 'mix'),
      jsonb_build_object('metric', 'Compras atribuidas', 'value', '186', 'vs_previous', '+22%', 'highlight', true, 'channel', 'mix'),
      jsonb_build_object('metric', 'Sesiones orgánicas GA4', 'value', '48.2k', 'vs_previous', '+12%', 'highlight', true, 'channel', 'ga4'),
      jsonb_build_object('metric', 'WhatsApp response rate', 'value', '86%', 'vs_previous', '+3pp', 'highlight', false, 'channel', 'whatsapp')
    ),
    'channel_highlights', jsonb_build_array(
      jsonb_build_object('channel', 'meta_ads', 'note', 'UGC + retargeting impulsaron ROAS'),
      jsonb_build_object('channel', 'google_ads', 'note', 'Competitor Search sigue lastrando'),
      jsonb_build_object('channel', 'tiktok_ads', 'note', 'Spark sumó volumen barato'),
      jsonb_build_object('channel', 'ga4', 'note', 'Orgánico +12% sesiones'),
      jsonb_build_object('channel', 'instagram_organic', 'note', 'Engagement rate 8.4%'),
      jsonb_build_object('channel', 'whatsapp', 'note', 'Response rate 86%')
    ),
    'wins', jsonb_build_array('Creatividades UGC top 3 en Retargeting', 'CPA compra -12% en Lookalike', 'Brand Search CTR 7.3%', 'TikTok Spark CTR 3.5%'),
    'explanations', jsonb_build_array(
      'El alza de ROAS viene de frezar creativos fatigosos y reforzar retargeting 7-30d.',
      'Competitor Search sigue lastrando el mix Google (−$510 con solo 6 conv.).',
      'Orgánico y WhatsApp sostuvieron el funnel sin costo de media adicional.'
    ),
    'next_month_plan', jsonb_build_array('Testear 8 UGC nuevos', 'Recortar Competitor Search 30%', 'Abrir Catalog Ads', 'Escalar TikTok Spark winner'),
    'report_ready_to_send', true
  ),
  'pending_approval',
  NULL,
  NOW() - INTERVAL '1 day'
),
-- Aura hace 2 meses — sent
(
  'f0a1a001-d000-4000-8000-000000000002',
  'd0a1c001-d000-4000-8000-000000000001',
  to_char(CURRENT_DATE - INTERVAL '2 months', 'YYYY-MM'),
  jsonb_build_object(
    'period', to_char(CURRENT_DATE - INTERVAL '2 months', 'YYYY-MM'),
    'headline', '[DEMO] Mes de setup: aprendizaje Meta + Brand Search; ROAS 1.9x en rampa',
    'key_metrics', jsonb_build_array(
      jsonb_build_object('metric', 'ROAS Meta', 'value', '1.9x', 'vs_previous', 'n/a', 'highlight', true),
      jsonb_build_object('metric', 'Spend total', 'value', 'USD 6.7k', 'vs_previous', 'n/a', 'highlight', false),
      jsonb_build_object('metric', 'Compras atribuidas', 'value', '152', 'vs_previous', 'n/a', 'highlight', false)
    ),
    'wins', jsonb_build_array('Pixel y CAPI estables', 'Primeras 4 creativas ganadoras identificadas'),
    'explanations', jsonb_build_array('Mes de learning: priorizamos volumen de señales vs eficiencia máxima.'),
    'next_month_plan', jsonb_build_array('Escalar lookalikes', 'Abrir retargeting 30d'),
    'report_ready_to_send', true
  ),
  'sent',
  NOW() - INTERVAL '40 days',
  NOW() - INTERVAL '42 days'
),
-- PeopleOps mes anterior — approved
(
  'f0a1a001-d000-4000-8000-000000000003',
  'd0a1c001-d000-4000-8000-000000000002',
  to_char(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'),
  jsonb_build_object(
    'period', to_char(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'),
    'headline', '[DEMO] 41 demos cualificados (+11% MoM); mix Google + LinkedIn Lead Gen + WhatsApp',
    'key_metrics', jsonb_build_array(
      jsonb_build_object('metric', 'Demos cualificados', 'value', '41', 'vs_previous', '+11%', 'highlight', true, 'channel', 'mix'),
      jsonb_build_object('metric', 'CPL demo', 'value', 'USD 92', 'vs_previous', '-6%', 'highlight', true, 'channel', 'google_ads'),
      jsonb_build_object('metric', 'Spend total', 'value', 'USD 3.8k', 'vs_previous', '+4%', 'highlight', false, 'channel', 'mix'),
      jsonb_build_object('metric', 'Show-rate demos', 'value', '62%', 'vs_previous', '+5pp', 'highlight', true, 'channel', 'whatsapp')
    ),
    'channel_highlights', jsonb_build_array(
      jsonb_build_object('channel', 'google_ads', 'note', 'Demand Gen supera Brand en volumen'),
      jsonb_build_object('channel', 'linkedin_ads', 'note', 'TL no justifica CPL; Lead Gen Form OK'),
      jsonb_build_object('channel', 'whatsapp', 'note', 'Nurture mejoró show-rate')
    ),
    'wins', jsonb_build_array('Demand Gen SaaS superó Brand en volumen', 'Secuencia nurture LinkedIn/WA mejoró show-rate'),
    'explanations', jsonb_build_array('LinkedIn Thought Leadership no justifica CPL; el volumen útil viene de Google + Lead Gen Form.'),
    'next_month_plan', jsonb_build_array('Pausar LinkedIn TL', 'Duplicar creativos Demand Gen', 'ABM light 20 cuentas target'),
    'report_ready_to_send', true
  ),
  'approved',
  NOW() - INTERVAL '12 hours',
  NOW() - INTERVAL '2 days'
),
-- Clínica mes anterior — pending
(
  'f0a1a001-d000-4000-8000-000000000004',
  'd0a1c001-d000-4000-8000-000000000003',
  to_char(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'),
  jsonb_build_object(
    'period', to_char(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'),
    'headline', '[DEMO] 168 turnos solicitados (+24%); CPL Meta $11.8 bajo meta de $14',
    'key_metrics', jsonb_build_array(
      jsonb_build_object('metric', 'Turnos solicitados', 'value', '168', 'vs_previous', '+24%', 'highlight', true),
      jsonb_build_object('metric', 'CPL Meta', 'value', 'USD 11.8', 'vs_previous', '-9%', 'highlight', true),
      jsonb_build_object('metric', 'Spend total', 'value', 'USD 2.9k', 'vs_previous', '+10%', 'highlight', false),
      jsonb_build_object('metric', 'Tasa confirmación', 'value', '54%', 'vs_previous', '+3pp', 'highlight', false)
    ),
    'wins', jsonb_build_array('Campañas locales Google con dayparting efectivo', 'Creativo "primera consulta" #1 en Meta'),
    'explanations', jsonb_build_array('El crecimiento viene de Search local + Meta ortodoncia; estética facial sigue con CPL alto.'),
    'next_month_plan', jsonb_build_array('Acortar forms Meta', 'Test offer blanqueamiento', 'Remarketing no-show'),
    'report_ready_to_send', true
  ),
  'pending_approval',
  NULL,
  NOW() - INTERVAL '18 hours'
),
-- NexaPay mes anterior — approved
(
  'f0a1a001-d000-4000-8000-000000000005',
  'd0a1c001-d000-4000-8000-000000000004',
  to_char(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'),
  jsonb_build_object(
    'period', to_char(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'),
    'headline', '[DEMO] 18.4k installs (−CPI 16%); retención D7 Meta 22% vs Google 11%',
    'key_metrics', jsonb_build_array(
      jsonb_build_object('metric', 'Installs', 'value', '18.4k', 'vs_previous', '+31%', 'highlight', true),
      jsonb_build_object('metric', 'CPI blended', 'value', 'USD 1.62', 'vs_previous', '-16%', 'highlight', true),
      jsonb_build_object('metric', 'Spend total', 'value', 'USD 29.8k', 'vs_previous', '+22%', 'highlight', false),
      jsonb_build_object('metric', 'D7 retention Meta', 'value', '22%', 'vs_previous', '+2pp', 'highlight', true)
    ),
    'wins', jsonb_build_array('UGC fintech #3 como creative winner', 'Advantage+ App salió de learning'),
    'explanations', jsonb_build_array('Google UAC entrega volumen barato pero calidad inferior; mix óptimo ~70% Meta / 30% Google.'),
    'next_month_plan', jsonb_build_array('Recortar UAC 40%', 'Escalar UGC #3', 'Test paywall soft-launch creatives'),
    'report_ready_to_send', true
  ),
  'approved',
  NOW() - INTERVAL '6 hours',
  NOW() - INTERVAL '1 day'
),
-- AulaViva hace 2 meses — sent (pre-pausa)
(
  'f0a1a001-d000-4000-8000-000000000006',
  'd0a1c001-d000-4000-8000-000000000005',
  to_char(CURRENT_DATE - INTERVAL '2 months', 'YYYY-MM'),
  jsonb_build_object(
    'period', to_char(CURRENT_DATE - INTERVAL '2 months', 'YYYY-MM'),
    'headline', '[DEMO] Último mes activo: 28 demos B2B; B2C pausado por calidad de leads',
    'key_metrics', jsonb_build_array(
      jsonb_build_object('metric', 'Demos B2B', 'value', '28', 'vs_previous', '-8%', 'highlight', true),
      jsonb_build_object('metric', 'CPA demo B2B', 'value', 'USD 148', 'vs_previous', '+9%', 'highlight', false),
      jsonb_build_object('metric', 'Spend total', 'value', 'USD 4.1k', 'vs_previous', '-35%', 'highlight', false)
    ),
    'wins', jsonb_build_array('Pipeline B2B escuelas intacto', 'Decisión de pausa B2C documentada'),
    'explanations', jsonb_build_array('Se redujo spend ante baja show-rate B2C; cuenta pasó a paused pendiente nuevo offer.'),
    'next_month_plan', jsonb_build_array('Reactivar solo Search B2B cuando haya offer nuevo'),
    'report_ready_to_send', true
  ),
  'sent',
  NOW() - INTERVAL '50 days',
  NOW() - INTERVAL '52 days'
)
ON CONFLICT (client_id, month) DO UPDATE SET
  id = EXCLUDED.id,
  report = EXCLUDED.report,
  status = EXCLUDED.status,
  approved_at = EXCLUDED.approved_at,
  created_at = EXCLUDED.created_at;

COMMIT;

SELECT 'clients_demo' AS tabla, count(*)::int AS n
FROM clients WHERE company ILIKE '%[DEMO Pampai]%'
UNION ALL
SELECT 'performance_demo', count(*)::int
FROM performance_reports WHERE analysis->>'data_source' = 'demo'
UNION ALL
SELECT 'monthly_demo', count(*)::int
FROM monthly_reports WHERE report->>'headline' ILIKE '%[DEMO]%'
UNION ALL
SELECT 'perf_pending', count(*)::int
FROM performance_reports WHERE analysis->>'data_source' = 'demo' AND status = 'pending_approval'
UNION ALL
SELECT 'monthly_pending', count(*)::int
FROM monthly_reports WHERE report->>'headline' ILIKE '%[DEMO]%' AND status = 'pending_approval';
