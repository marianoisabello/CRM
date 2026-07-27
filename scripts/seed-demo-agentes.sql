-- ═══════════════════════════════════════════════════════════════
-- Seed DEMO — Analista (perfiles) + Reuniones + Briefing
-- Proyecto Supabase: hgzyfatstcjgvjmseusf
-- SOLO toca emails *@demo.pampai.com / external_id demo-*
-- Idempotente: limpia demos previos y reinserta
-- Aplicar: supabase db query --linked -f scripts/seed-demo-agentes.sql
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ─── Limpieza segura (solo demo) ───────────────────────────────
DELETE FROM briefings
WHERE lead_email ILIKE '%@demo.pampai.com'
   OR perfil_email ILIKE '%@demo.pampai.com';

DELETE FROM reuniones
WHERE lead_email ILIKE '%@demo.pampai.com'
   OR external_id LIKE 'demo-reunion-%';

DELETE FROM lead_propuestas
WHERE email ILIKE '%@demo.pampai.com';

DELETE FROM perfiles
WHERE email ILIKE '%@demo.pampai.com';

DELETE FROM leads
WHERE email ILIKE '%@demo.pampai.com'
   OR (external_id IS NOT NULL AND external_id LIKE 'demo-%');

-- ─── Leads demo (7) ───────────────────────────────────────────
INSERT INTO leads (
  id, source, external_id, name, contact, contact_type, email, message,
  status, raw_payload, score, classification, next_action, sdr_notes,
  nombre_apellido, empresa, cargo, whatsapp, web_sitio, pais_ciudad,
  objetivo_necesidad, score_total, categoria_lead, "tamaño_negocio"
) VALUES
(
  'c0a1e001-d000-4000-8000-000000000001',
  'web_form', 'demo-lucia-martinez',
  'Lucía Martínez', '+5491100000001', 'phone', 'lucia.martinez@demo.pampai.com',
  'E-commerce de moda. Necesitamos escalar Meta Ads y mejorar ROAS antes de Black Friday.',
  'qualified',
  '{"seed":true,"demo":true,"note":"DEMO Pampai — no es lead real"}'::jsonb,
  88, 'hot', 'schedule_meeting',
  '[DEMO] Lead caliente e-commerce moda. Budget definido.',
  'Lucía Martínez', 'Aura Moda', 'CMO', '+5491100000001',
  'https://example.com/aura-moda', 'Buenos Aires, AR',
  'Escalar ads y ROAS para temporada alta', 88, 'CALIENTE', '11-50'
),
(
  'c0a1e001-d000-4000-8000-000000000002',
  'linkedin', 'demo-diego-silva',
  'Diego Silva', 'https://linkedin.com/in/demo-diego-silva', 'linkedin_profile',
  'diego.silva@demo.pampai.com',
  'SaaS B2B de RRHH. Buscamos estrategia 360 y generación de demos cualificados.',
  'contacted',
  '{"seed":true,"demo":true,"note":"DEMO Pampai — no es lead real"}'::jsonb,
  82, 'hot', 'schedule_meeting',
  '[DEMO] SaaS con ciclo de venta mediano. Ticket alto.',
  'Diego Silva', 'PeopleOps Cloud', 'Head of Growth', '+5491100000002',
  'https://example.com/peopleops', 'Córdoba, AR',
  'Pipeline de demos B2B y posicionamiento de categoría', 82, 'CALIENTE', '51-200'
),
(
  'c0a1e001-d000-4000-8000-000000000003',
  'instagram', 'demo-ana-rojas',
  'Ana Rojas', 'ana.rojas.demo', 'instagram_handle',
  'ana.rojas@demo.pampai.com',
  'Clínica dental multi-sede. Queremos presencia en redes y agenda de turnos online.',
  'qualified',
  '{"seed":true,"demo":true,"note":"DEMO Pampai — no es lead real"}'::jsonb,
  74, 'hot', 'schedule_meeting',
  '[DEMO] Salud / clínicas. Enfoque local + contenido.',
  'Ana Rojas', 'Clínica Sonrisa Norte', 'Directora Comercial', '+5491100000003',
  'https://example.com/sonrisa-norte', 'Rosario, AR',
  'Más turnos desde Instagram y Google', 74, 'CALIENTE', '11-50'
),
(
  'c0a1e001-d000-4000-8000-000000000004',
  'web_form', 'demo-carlos-vega',
  'Carlos Vega', '+5491100000004', 'phone',
  'carlos.vega@demo.pampai.com',
  'Constructora B2B. Necesitamos SEO y contenidos para captar proyectos corporativos.',
  'contacted',
  '{"seed":true,"demo":true,"note":"DEMO Pampai — no es lead real"}'::jsonb,
  79, 'hot', 'schedule_meeting',
  '[DEMO] B2B industrial. Ciclo largo, SEO content.',
  'Carlos Vega', 'Vega Obras SA', 'Gerente Comercial', '+5491100000004',
  'https://example.com/vega-obras', 'Mendoza, AR',
  'Leads B2B cualificados vía orgánico', 79, 'CALIENTE', '51-200'
),
(
  'c0a1e001-d000-4000-8000-000000000005',
  'email', 'demo-sofia-nguyen',
  'Sofía Nguyen', 'sofia.nguyen@demo.pampai.com', 'email',
  'sofia.nguyen@demo.pampai.com',
  'Fintech seed. Performance ads + landing para lanzamiento de wallet B2C.',
  'new',
  '{"seed":true,"demo":true,"note":"DEMO Pampai — no es lead real"}'::jsonb,
  71, 'warm', 'schedule_meeting',
  '[DEMO] Fintech early-stage. Alta urgencia de lanzamiento.',
  'Sofía Nguyen', 'NexaPay', 'Co-founder / Marketing', '+5491100000005',
  'https://example.com/nexapay', 'CABA, AR',
  'Adquisición de usuarios wallet en 90 días', 71, 'TIBIO', '1-10'
),
(
  'c0a1e001-d000-4000-8000-000000000006',
  'whatsapp', 'demo-martin-lopez',
  'Martín López', '+5491100000006', 'phone',
  'martin.lopez@demo.pampai.com',
  'Grupo gastronómico. Branding y redes para nueva marca de brunchs.',
  'contacted',
  '{"seed":true,"demo":true,"note":"DEMO Pampai — no es lead real"}'::jsonb,
  66, 'warm', 'send_info',
  '[DEMO] Hospitality. Branding one-shot + redes.',
  'Martín López', 'Grupo Brasa', 'Dueño', '+5491100000006',
  'https://example.com/grupo-brasa', 'Palermo, AR',
  'Lanzar marca con identidad fuerte y comunidad', 66, 'TIBIO', '11-50'
),
(
  'c0a1e001-d000-4000-8000-000000000007',
  'manychat', 'demo-valentina-cruz',
  'Valentina Cruz', '+5491100000007', 'phone',
  'valentina.cruz@demo.pampai.com',
  'EduTech. Estrategia 360 para captar B2B escuelas y B2C padres.',
  'qualified',
  '{"seed":true,"demo":true,"note":"DEMO Pampai — no es lead real"}'::jsonb,
  85, 'hot', 'schedule_meeting',
  '[DEMO] EduTech dual audience. Estrategia integral.',
  'Valentina Cruz', 'AulaViva', 'VP Marketing', '+5491100000007',
  'https://example.com/aulaviva', 'Montevideo, UY',
  'Plan comercial digital 6 meses dual funnel', 85, 'CALIENTE', '11-50'
);

-- ─── Perfiles Analista (7) ────────────────────────────────────
INSERT INTO perfiles (
  email, nombre, empresa, cargo, rubro, tamanio_empresa, sitio_web, ciudad, telefono,
  source, sdr_score, sdr_categoria, lead_id,
  pain_points_inferidos, servicios_recomendados, oferta_estimada,
  ultimo_contacto, frecuencia_contacto, score_potencial, razones, objetivo_original,
  research_context, research_summary,
  propuesta_id, propuesta_origen, propuesta_notas, propuesta_asignada_at,
  updated_at
) VALUES
(
  'lucia.martinez@demo.pampai.com', 'Lucía Martínez', 'Aura Moda', 'CMO', 'E-commerce / Moda',
  '11-50', 'https://example.com/aura-moda', 'Buenos Aires, AR', '+5491100000001',
  'web_form', 88, 'CALIENTE', 'c0a1e001-d000-4000-8000-000000000001',
  '["ROAS cayendo en Meta","Dependencia de creatividades cortas","Atribución confusa entre IG y Google","Stock y logística limitan escala"]'::jsonb,
  '["Performance ads (Meta + Google)","Gestión de redes sociales","Estrategia de marketing 360"]'::jsonb,
  'USD 1.800–3.200/mes + media spend',
  CURRENT_DATE - 3, 4, 91,
  '[DEMO @demo.pampai.com] Alta urgencia Black Friday, budget confirmado, decisor presente. Buen fit con performance Dana.',
  'Escalar ads y ROAS para temporada alta',
  '{"demo":true,"sitio":{"ok":true,"headline":"Aura Moda — ropa urbana"},"search":["competidores locales","tiktok fashion ads"]}'::jsonb,
  'Sitio con catálogo activo y checkout. Redes con engagement medio. Competidores invierten fuerte en Meta. Oportunidad: creatividades UGC + catálogo dinámico + medición server-side.',
  '40df79e9-a02b-4b9e-be2e-688e37c46d87', 'auto',
  'Match automático por pain de ROAS y temporada alta', NOW() - INTERVAL '2 days', NOW()
),
(
  'diego.silva@demo.pampai.com', 'Diego Silva', 'PeopleOps Cloud', 'Head of Growth', 'SaaS B2B / HR Tech',
  '51-200', 'https://example.com/peopleops', 'Córdoba, AR', '+5491100000002',
  'linkedin', 82, 'CALIENTE', 'c0a1e001-d000-4000-8000-000000000002',
  '["Pocos MQLs calificados","Mensaje de categoría poco claro","Dependencia de outbound frío","Landing genérica sin cases"]'::jsonb,
  '["Estrategia de marketing 360","SEO y contenidos","Performance ads (Meta + Google)"]'::jsonb,
  'USD 2.200–3.500/mes',
  CURRENT_DATE - 5, 3, 87,
  '[DEMO @demo.pampai.com] SaaS con ARR creciente. Necesita demand gen + posicionamiento. Ciclo 30-60 días.',
  'Pipeline de demos B2B y posicionamiento de categoría',
  '{"demo":true,"sitio":{"ok":true,"cta":"Agendar demo"},"linkedin":"empresa activa en contenido HR"}'::jsonb,
  'Producto sólido, website con pricing oculto. Contenido LinkedIn irregular. Oportunidad: ABM light + contenido category design + paid LinkedIn/Google Search.',
  '9d49d521-1f8f-4de5-8ae1-5a1da441cc4f', 'manual',
  'Asignado manual: estrategia 360 como ancla', NOW() - INTERVAL '1 day', NOW()
),
(
  'ana.rojas@demo.pampai.com', 'Ana Rojas', 'Clínica Sonrisa Norte', 'Directora Comercial', 'Salud / Odontología',
  '11-50', 'https://example.com/sonrisa-norte', 'Rosario, AR', '+5491100000003',
  'instagram', 74, 'CALIENTE', 'c0a1e001-d000-4000-8000-000000000003',
  '["Agenda incompleta entre semana","Contenido poco profesional","Sin tracking de turnos desde redes","Competencia local con ads agresivos"]'::jsonb,
  '["Gestión de redes sociales","Performance ads (Meta + Google)","SEO y contenidos"]'::jsonb,
  'USD 1.200–2.000/mes + spend local',
  CURRENT_DATE - 2, 5, 78,
  '[DEMO @demo.pampai.com] Multi-sede. Buen fit redes + ads locales. Decisor comercial con budget mensual.',
  'Más turnos desde Instagram y Google',
  '{"demo":true,"ig":"~4.2k followers","gmb":"perfil incompleto"}'::jsonb,
  'IG con antes/después sin CTA claro. Google Business Profile incompleto. Oportunidad: sistema de contenidos clínicas + campañas de captura de leads WhatsApp.',
  'd935cc0b-fb26-4b1c-8dca-61e207076594', 'auto',
  'Match por necesidad de community + contenido clínico', NOW() - INTERVAL '4 days', NOW()
),
(
  'carlos.vega@demo.pampai.com', 'Carlos Vega', 'Vega Obras SA', 'Gerente Comercial', 'Construcción / B2B',
  '51-200', 'https://example.com/vega-obras', 'Mendoza, AR', '+5491100000004',
  'web_form', 79, 'CALIENTE', 'c0a1e001-d000-4000-8000-000000000004',
  '["Sitio desactualizado","Casi cero tráfico orgánico","Sin casos de obra publicados","Dependencia 100% de referidos"]'::jsonb,
  '["SEO y contenidos","Estrategia de marketing 360","Branding y rediseño"]'::jsonb,
  'USD 1.500–2.800/mes',
  CURRENT_DATE - 7, 2, 80,
  '[DEMO @demo.pampai.com] Empresa consolidada. Quiere profesionalizar inbound B2B. Ticket de proyecto alto.',
  'Leads B2B cualificados vía orgánico',
  '{"demo":true,"sitio":{"tech":"WordPress legacy","speed":"lento"},"search":["constructora Mendoza"]}'::jsonb,
  'Dominio antiguo con poco SEO on-page. Oportunidad: hub de contenidos obras + landing por vertical (retail, industrial, housing).',
  'd2fce6f1-d72c-443f-ba3c-be9e80c1082b', 'auto',
  'SEO como puerta de entrada B2B', NOW() - INTERVAL '6 days', NOW()
),
(
  'sofia.nguyen@demo.pampai.com', 'Sofía Nguyen', 'NexaPay', 'Co-founder / Marketing', 'Fintech',
  '1-10', 'https://example.com/nexapay', 'CABA, AR', '+5491100000005',
  'email', 71, 'TIBIO', 'c0a1e001-d000-4000-8000-000000000005',
  '["Sin historial de paid","Compliance limita claims","CAC desconocido","Landing de waitlist sin CRO"]'::jsonb,
  '["Performance ads (Meta + Google)","Estrategia de marketing 360"]'::jsonb,
  'USD 1.500–2.500/mes + spend test',
  CURRENT_DATE - 1, 2, 76,
  '[DEMO @demo.pampai.com] Lanzamiento en 90 días. Alto learning needed. Riesgo: presupuesto de media aún flexible.',
  'Adquisición de usuarios wallet en 90 días',
  '{"demo":true,"stage":"seed","waitlist":1200}'::jsonb,
  'Waitlist activa. Landing minimalista. Oportunidad: tests creativos + funnel waitlist→KYC con medición limpia y mensajes compliance-safe.',
  '40df79e9-a02b-4b9e-be2e-688e37c46d87', 'auto',
  'Performance para lanzamiento B2C', NOW() - INTERVAL '12 hours', NOW()
),
(
  'martin.lopez@demo.pampai.com', 'Martín López', 'Grupo Brasa', 'Dueño', 'Gastronomía',
  '11-50', 'https://example.com/grupo-brasa', 'Palermo, AR', '+5491100000006',
  'whatsapp', 66, 'TIBIO', 'c0a1e001-d000-4000-8000-000000000006',
  '["Marca nueva sin identidad","IG inconsistente","Sin fotografía profesional","Competencia fuerte en Palermo"]'::jsonb,
  '["Branding y rediseño","Gestión de redes sociales"]'::jsonb,
  'USD 2.500–4.500 one-shot branding + USD 900–1.200/mes redes',
  CURRENT_DATE - 4, 3, 70,
  '[DEMO @demo.pampai.com] Dueño involucrado. Quieren look premium. Budget one-shot + retainer redes.',
  'Lanzar marca con identidad fuerte y comunidad',
  '{"demo":true,"locales":2,"apertura":"Q3"}'::jsonb,
  'Grupo con 2 locales exitosos. Nueva marca brunch necesita sistema visual + contenido lifestyle. Oportunidad: branding kit + calendario soft launch.',
  '856d1afc-17fe-452a-b27f-fbc961973aa1', 'manual',
  'Branding priorizado por dueño', NOW() - INTERVAL '3 days', NOW()
),
(
  'valentina.cruz@demo.pampai.com', 'Valentina Cruz', 'AulaViva', 'VP Marketing', 'EduTech',
  '11-50', 'https://example.com/aulaviva', 'Montevideo, UY', '+5491100000007',
  'manychat', 85, 'CALIENTE', 'c0a1e001-d000-4000-8000-000000000007',
  '["Mensaje distinto para B2B vs B2C","CAC B2C alto","Poco contenido de prueba social","Sin playbook de webinars"]'::jsonb,
  '["Estrategia de marketing 360","Performance ads (Meta + Google)","SEO y contenidos"]'::jsonb,
  'USD 2.000–3.200/mes',
  CURRENT_DATE - 2, 4, 89,
  '[DEMO @demo.pampai.com] Dual funnel claro. Equipo interno chico. Buscan partner estratégico 6 meses.',
  'Plan comercial digital 6 meses dual funnel',
  '{"demo":true,"product":"plataforma clases live","markets":["UY","AR"]}'::jsonb,
  'Producto con retención buena en piloto. Marketing aún táctico. Oportunidad: estrategia 360 con dos funnels, contenido teachers + paid parents, y SEO de intención educativa.',
  '9d49d521-1f8f-4de5-8ae1-5a1da441cc4f', 'auto',
  'Estrategia 360 por dual audience', NOW() - INTERVAL '2 days', NOW()
);

-- ─── Reuniones (6) con videos públicos reales ─────────────────
-- Videos: YouTube talks/meetings + sample MP4 Google storage
INSERT INTO reuniones (
  id, fecha, duracion_min, participantes, lead_email, lead_phone, lead_id,
  titulo, resumen, pain_points, objeciones, nivel_interes, senales_compra,
  proximos_pasos, frases_destacadas, score_cierre, transcript, transcript_url,
  recording_url, source, external_id, status, raw_payload, created_at, updated_at
) VALUES
(
  'c0a3e003-d000-4000-8000-000000000001',
  NOW() - INTERVAL '6 days', 42,
  '[{"nombre":"Lucía Martínez","rol":"CMO"},{"nombre":"Dana SDR","rol":"Dana"},{"nombre":"Analista Dana","rol":"Dana"}]'::jsonb,
  'lucia.martinez@demo.pampai.com', '+5491100000001', 'c0a1e001-d000-4000-8000-000000000001',
  'Discovery · Aura Moda — Performance Q4',
  'Discovery enfocada en ROAS Meta y preparación Black Friday. Lucía confirmó budget de media y pidió propuesta de performance + creatividades UGC en 7 días.',
  '["ROAS en baja hace 6 semanas","Equipo interno saturado de creatividades","Atribución iOS confusa"]'::jsonb,
  '["Miedo a subir spend sin creatividades nuevas","Comparación con agencia anterior (poca reporting)"]'::jsonb,
  'ALTO',
  '["Pidió propuesta formal esta semana","Confirmó budget USD 8k media/mes","Mencionó aprobación del CEO ya alineada"]'::jsonb,
  '["Enviar brief + propuesta performance","Compartir 2 cases e-commerce moda","Agendar follow-up con creativo"]'::jsonb,
  '["Si no mejoramos creatividades, el Black Friday nos va a matar","El CEO ya sabe que vamos a cambiar de agencia"]'::jsonb,
  86,
  E'Dana: Contame el contexto de ads hoy.\nLucía: Estamos en Meta y un poco Google. El ROAS bajó de 3.2 a 1.8.\nDana: ¿Quién aprueba budget?\nLucía: Yo con el CEO. Ya hablamos de invertir más si hay plan claro.\n...\nLucía: Necesito propuesta antes del viernes.',
  'https://www.youtube.com/watch?v=5MgBikgcWnY',
  'https://www.youtube.com/watch?v=5MgBikgcWnY',
  'zoom', 'demo-reunion-aura-moda', 'done',
  '{"demo":true,"provider":"zoom"}'::jsonb, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'
),
(
  'c0a3e003-d000-4000-8000-000000000002',
  NOW() - INTERVAL '5 days', 38,
  '[{"nombre":"Diego Silva","rol":"Head of Growth"},{"nombre":"Consultor Dana","rol":"Dana"}]'::jsonb,
  'diego.silva@demo.pampai.com', '+5491100000002', 'c0a1e001-d000-4000-8000-000000000002',
  'Discovery · PeopleOps Cloud — Demand Gen B2B',
  'Reunión de diagnóstico B2B SaaS. Diego busca generar demos cualificados y clarificar mensaje de categoría. Interés alto en estrategia 360 + contenidos LinkedIn.',
  '["Pocos demos/semana","ICP no operativo en paid","Sin case studies recientes"]'::jsonb,
  '["Presupuesto mensual aún en revisión con CFO","Quiere ver timeline a 90 días"]'::jsonb,
  'ALTO',
  '["Solicitó workshop de posicionamiento","Comparte deck interno de ICP","Pide ROI estimado por canal"]'::jsonb,
  '["Armar estrategia 90 días","Mapear ICP + mensajes","Propuesta con fee + recomendación de spend"]'::jsonb,
  '["Si no arreglamos el mensaje, el paid no sirve","Queremos un partner, no un ejecutor de posts"]'::jsonb,
  81,
  E'Diego: Hoy entran 8-10 demos/mes y necesitamos el doble.\nDana: ¿Qué % cierra?\nDiego: ~18%. El problema es calidad del lead.\n...',
  'https://www.youtube.com/watch?v=D6_J7FfgWVc',
  'https://www.youtube.com/watch?v=D6_J7FfgWVc',
  'google_meet', 'demo-reunion-peopleops', 'done',
  '{"demo":true,"provider":"google_meet"}'::jsonb, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
),
(
  'c0a3e003-d000-4000-8000-000000000003',
  NOW() - INTERVAL '4 days', 28,
  '[{"nombre":"Ana Rojas","rol":"Directora Comercial"},{"nombre":"Dana","rol":"Dana"}]'::jsonb,
  'ana.rojas@demo.pampai.com', '+5491100000003', 'c0a1e001-d000-4000-8000-000000000003',
  'Discovery · Clínica Sonrisa Norte — Redes + turnos',
  'Call corta por WhatsApp (notas + audio). Ana quiere llenar agenda entre semana con contenido e Instagram Ads locales. Buena receptividad a retainer de redes.',
  '["Huecos en agenda martes-jueves","Respuestas lentas en DM","Sin protocolo de leads WhatsApp"]'::jsonb,
  '["No quieren verse demasiado comerciales","Presupuesto ads local acotado al inicio"]'::jsonb,
  'MEDIO',
  '["Pidió ejemplos de clínicas similares","Confirma 2 sedes listas para piloto"]'::jsonb,
  '["Enviar plan de contenidos 30 días","Setup tracking WhatsApp","Propuesta redes + ads locales"]'::jsonb,
  '["Si alguien escribe a las 10pm, se pierde el turno","Necesitamos vernos más profesionales"]'::jsonb,
  72,
  E'Ana: Los lunes explotamos y martes vacío.\nDana: ¿Quién responde DMs?\nAna: Recepción, cuando puede.\n...',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'whatsapp', 'demo-reunion-sonrisa', 'done',
  '{"demo":true,"provider":"whatsapp","note":"audio + notas"}'::jsonb, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'
),
(
  'c0a3e003-d000-4000-8000-000000000004',
  NOW() - INTERVAL '3 days', 45,
  '[{"nombre":"Carlos Vega","rol":"Gerente Comercial"},{"nombre":"Dana SEO","rol":"Dana"}]'::jsonb,
  'carlos.vega@demo.pampai.com', '+5491100000004', 'c0a1e001-d000-4000-8000-000000000004',
  'Discovery · Vega Obras — SEO B2B',
  'Deep dive en inbound B2B. Carlos reconoce dependencia de referidos y quiere hub de contenidos de obras. Interés en SEO + refresh de marca digital.',
  '["Cero leads orgánicos medibles","Sitio lento y desactualizado","Sin verticalización de ofertas"]'::jsonb,
  '["Ciclo de decisión interno lento (socios)","Quiere ver quick wins en 60 días"]'::jsonb,
  'ALTO',
  '["Aprobó auditoría SEO inicial","Compartirá fotos de obras","Preguntó por contrato semestral"]'::jsonb,
  '["Auditoría técnica + keywords","Propuesta SEO + contenidos","Incluir opción branding web"]'::jsonb,
  '["Los referidos no alcanzan para el plan 2026","Necesitamos parecer más corporativos online"]'::jsonb,
  77,
  E'Carlos: El 90% llega por recomendación.\nDana: ¿Tienen CRM de leads web?\nCarlos: No, casi nadie completa el form.\n...',
  'https://www.youtube.com/watch?v=8S0FDjFBj8o',
  'https://www.youtube.com/watch?v=8S0FDjFBj8o',
  'manual', 'demo-reunion-vega', 'done',
  '{"demo":true,"provider":"manual_upload"}'::jsonb, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
),
(
  'c0a3e003-d000-4000-8000-000000000005',
  NOW() - INTERVAL '2 days', 35,
  '[{"nombre":"Sofía Nguyen","rol":"Co-founder"},{"nombre":"Dana Performance","rol":"Dana"}]'::jsonb,
  'sofia.nguyen@demo.pampai.com', '+5491100000005', 'c0a1e001-d000-4000-8000-000000000005',
  'Kickoff · NexaPay — Lanzamiento wallet',
  'Kickoff de lanzamiento. Sofía necesita tests de adquisición compliance-safe en 90 días. Score alto de interés; presupuesto de media en definición con inversores.',
  '["Sin baseline de CAC","Claims limitados por compliance","Landing sin CRO"]'::jsonb,
  '["Spend aún no firmado (board)","Quiere reporting diario al inicio"]'::jsonb,
  'ALTO',
  '["Pidió sprint de creatividades 2 semanas","Compartió guidelines legales","Quiere start ASAP post-board"]'::jsonb,
  '["Brief creativo compliance","Propuesta performance 90 días","Checklist tracking KYC"]'::jsonb,
  '["Si no aprendemos rápido, quemamos runway","Necesitamos partner que entienda fintech"]'::jsonb,
  74,
  E'Sofía: Tenemos waitlist de 1200. El board decide spend el jueves.\nDana: Armamos plan de tests con techos semanales.\n...',
  'https://www.youtube.com/watch?v=unr4s3jd9-A',
  'https://www.youtube.com/watch?v=unr4s3jd9-A',
  'zoom', 'demo-reunion-nexapay', 'done',
  '{"demo":true,"provider":"zoom"}'::jsonb, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
),
(
  'c0a3e003-d000-4000-8000-000000000006',
  NOW() - INTERVAL '1 day', 40,
  '[{"nombre":"Valentina Cruz","rol":"VP Marketing"},{"nombre":"Dana Strategy","rol":"Dana"}]'::jsonb,
  'valentina.cruz@demo.pampai.com', '+5491100000007', 'c0a1e001-d000-4000-8000-000000000007',
  'Workshop · AulaViva — Dual funnel 6 meses',
  'Workshop de estrategia. Valentina alineó dual funnel B2B escuelas / B2C padres. Quiere partner estratégico y brief ejecutivo para directorio.',
  '["Mensajes mezclados B2B/B2C","CAC padres alto","Falta playbook webinar"]'::jsonb,
  '["Necesita buy-in del CEO con brief claro","Pide KPIs realistas sin overpromise"]'::jsonb,
  'ALTO',
  '["Solicitó briefing formal ENVIADO al board","Confirmó retainer 6 meses si hay plan","Comparte acceso analytics"]'::jsonb,
  '["Redactar briefing ejecutivo","Separar funnels y KPIs","Propuesta estrategia 360"]'::jsonb,
  '["No queremos posts: queremos un sistema","El board necesita un one-pager claro"]'::jsonb,
  88,
  E'Valentina: Tenemos dos audiencias que no pueden hablar el mismo idioma.\nDana: Separamos funnels, creatividades y KPIs.\nValentina: Perfecto. Necesito el brief para el martes.\n...',
  'https://www.youtube.com/watch?v=i5e50qV2yXs',
  'https://www.youtube.com/watch?v=i5e50qV2yXs',
  'google_meet', 'demo-reunion-aulaviva', 'done',
  '{"demo":true,"provider":"google_meet"}'::jsonb, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
);

-- ─── Briefings ejemplo (5) — plantillas comerciales útiles ────
INSERT INTO briefings (
  id, lead_email, lead_id, perfil_email, reunion_id, propuesta_id,
  objetivo_cliente, servicios_sugeridos, presupuesto_estimado, plazo,
  kpis, riesgos_detectados, diferenciadores, resumen_ejecutivo, brief_markdown,
  brief_completo_url, version, status, raw_llm, created_at, updated_at
) VALUES
(
  'c0a4e004-d000-4000-8000-000000000001',
  'lucia.martinez@demo.pampai.com', 'c0a1e001-d000-4000-8000-000000000001',
  'lucia.martinez@demo.pampai.com', 'c0a3e003-d000-4000-8000-000000000001',
  '40df79e9-a02b-4b9e-be2e-688e37c46d87',
  'Recuperar ROAS y escalar adquisición rentable hacia Black Friday sin quemar creatividades.',
  '["Performance ads (Meta + Google)","Gestión de redes sociales (UGC/creativos)","Tracking & reporting semanal"]'::jsonb,
  'Fee Dana USD 1.800–2.400/mes + media spend USD 6.000–10.000/mes',
  '8 semanas (prep BF) + retainer post-campaña',
  '["ROAS Meta ≥ 2.5 en 6 semanas","CPA compra -20% vs baseline","≥ 12 creatividades testadas/mes","Reporting semanal con aprendizajes"]'::jsonb,
  '["Dependencia de stock/logística","iOS attribution noise","Retraso en assets UGC del cliente"]'::jsonb,
  '["Enfoque creativo UGC + catálogo","Ritual semanal de kill/scale","Transparencia de learning agenda"]'::jsonb,
  'Aura Moda necesita un sprint de performance orientado a temporada alta: reconstrucción creativa, medición más limpia y escala controlada del spend. Este brief sirve de plantilla para e-commerce moda.',
  $md$
# Briefing comercial — Aura Moda (DEMO)

> **Plantilla útil para:** e-commerce moda / retail digital con urgencia de temporada.
> **Estado:** ENVIADO · **Email:** lucia.martinez@demo.pampai.com

## 1. Resumen ejecutivo
Aura Moda llega con ROAS en baja y Black Friday a 8 semanas. El objetivo es recuperar eficiencia y preparar escala sin sobreprometer resultados. Dana propone un plan de **Performance Ads (Meta + Google)** con motor creativo UGC y ritual semanal de optimización.

## 2. Objetivo del cliente
- Recuperar ROAS y bajar CPA de compra.
- Llegar a BF con banco de creatividades probadas.
- Tener reporting accionable (no vanity metrics).

## 3. Servicios sugeridos
| Servicio | Rol en el plan |
|---|---|
| Performance ads (Meta + Google) | Adquisición + retargeting |
| Redes / UGC creative support | Volumen de tests creativos |
| Tracking & reporting | Decisiones semanales kill/scale |

## 4. Presupuesto estimado
- **Fee Dana:** USD 1.800–2.400 / mes
- **Media spend (cliente):** USD 6.000–10.000 / mes
- Inversión creativa UGC: a definir (in-house o producción externa)

## 5. Plazo
- Semanas 1–2: auditoría, tracking, baseline, primer batch creativo
- Semanas 3–6: tests + escala controlada
- Semanas 7–8: plan BF y playbook de pujas/creatividades

## 6. KPIs (orientativos, no promesa)
- ROAS Meta ≥ 2.5 en 6 semanas (vs baseline actual)
- CPA compra −20% vs baseline
- ≥ 12 creatividades nuevas testadas / mes
- Share de spend en winners ≥ 60% al cierre del sprint

## 7. Riesgos y mitigación
| Riesgo | Mitigación |
|---|---|
| Stock/logística | Cap de escala por SKU |
| Atribución iOS | Triangulación con backend orders |
| Assets lentos | Calendario UGC con dueños claros |

## 8. Próximos pasos
1. Aprobar brief y fee.
2. Conceder accesos Ads + Analytics + catálogo.
3. Kickoff creativo (día 3).
4. Primer reporte de learning (día 14).

---
*Documento DEMO Pampai / Dana MKT — no es un cliente real.*
$md$,
  NULL, 2, 'ENVIADO',
  '{"demo":true,"template":"ecommerce_performance"}'::jsonb,
  NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
),
(
  'c0a4e004-d000-4000-8000-000000000002',
  'diego.silva@demo.pampai.com', 'c0a1e001-d000-4000-8000-000000000002',
  'diego.silva@demo.pampai.com', 'c0a3e003-d000-4000-8000-000000000002',
  '9d49d521-1f8f-4de5-8ae1-5a1da441cc4f',
  'Duplicar demos cualificados B2B y clarificar posicionamiento de categoría en 90 días.',
  '["Estrategia de marketing 360","SEO y contenidos (category)","Paid LinkedIn/Search de soporte"]'::jsonb,
  'Fee Dana USD 2.200–3.200/mes (+ spend paid opcional)',
  '90 días (fase 1) con opción a 6 meses',
  '["Demos calificados +40% en 90 días","SQL rate ≥ 35%","2 case studies publicados","Mensaje ICP unificado en web+LinkedIn"]'::jsonb,
  '["Aprobación CFO pendiente","Ciclo de venta 30-60 días diluye aprendizaje paid","Contenido depende de SMEs internos"]'::jsonb,
  '["Category design + ABM light","Workshop de mensaje","Contenido con proof, no fluff"]'::jsonb,
  'PeopleOps Cloud necesita un sistema de demanda B2B: mensaje claro, contenidos de prueba y captura de demos de calidad. Plantilla ideal para SaaS mid-market.',
  $md$
# Briefing comercial — PeopleOps Cloud (DEMO)

> **Plantilla útil para:** SaaS B2B / demand generation.
> **Estado:** REVISADO · **Email:** diego.silva@demo.pampai.com

## 1. Resumen ejecutivo
El cuello de botella no es solo volumen de demos: es **calidad + mensaje de categoría**. Proponemos Estrategia 360 con workshop de posicionamiento, motor de contenidos SEO/LinkedIn y paid de soporte una vez el mensaje esté estable.

## 2. Objetivo del cliente
Pasar de ~8–10 demos/mes a un pipeline predecible de demos ICP, con mejor SQL rate.

## 3. Servicios sugeridos
1. Estrategia de marketing 360 (ancla)
2. SEO y contenidos (category + use cases)
3. Performance de soporte (Search / LinkedIn) post-mensaje

## 4. Presupuesto estimado
- Fee: **USD 2.200–3.200 / mes**
- Spend paid: USD 2.000–4.000 / mes (fase 2)

## 5. Plazo (90 días)
| Fase | Qué |
|---|---|
| Días 1–15 | Workshop mensaje + ICP operativo + quick wins web |
| Días 16–45 | Contenidos + case studies + nurture |
| Días 46–90 | Paid de soporte + optimización de conversion a demo |

## 6. KPIs
- Demos calificados +40% vs baseline
- SQL rate ≥ 35%
- 2 case studies live
- Bounce rate landing demo −15%

## 7. Riesgos
- CFO aún no fija techo mensual → brief en dos escenarios (lean / full).
- Dependencia de SMEs para cases → calendarizar entrevistas.

## 8. Próximos pasos
1. Revisar este brief con CFO.
2. Confirmar escenario de inversión.
3. Agendar workshop de posicionamiento (medio día).

---
*Documento DEMO Pampai / Dana MKT — plantilla SaaS B2B.*
$md$,
  NULL, 1, 'REVISADO',
  '{"demo":true,"template":"saas_b2b_360"}'::jsonb,
  NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'
),
(
  'c0a4e004-d000-4000-8000-000000000003',
  'ana.rojas@demo.pampai.com', 'c0a1e001-d000-4000-8000-000000000003',
  'ana.rojas@demo.pampai.com', 'c0a3e003-d000-4000-8000-000000000003',
  'd935cc0b-fb26-4b1c-8dca-61e207076594',
  'Llenar agenda entre semana con leads locales desde Instagram y Google, con respuesta rápida por WhatsApp.',
  '["Gestión de redes sociales","Ads locales Meta + Google","Protocolo de respuesta WhatsApp"]'::jsonb,
  'Fee USD 1.200–1.800/mes + spend local USD 800–1.500/mes',
  'Piloto 60 días en 2 sedes',
  '["+25% turnos entre semana vs baseline","Tiempo respuesta DM < 15 min horario hábil","Costo por lead WhatsApp medido semanal"]'::jsonb,
  '["Restricciones de claims médicos","Capacidad de recepción para responder DMs","Estacionalidad local"]'::jsonb,
  '["Sistema de contenidos clínicos con CTA","Lead → WhatsApp con SLA","Creatividades locales por sede"]'::jsonb,
  'Brief piloto para clínicas multi-sede: redes + ads locales + protocolo WhatsApp. Ideal como plantilla vertical salud.',
  $md$
# Briefing comercial — Clínica Sonrisa Norte (DEMO)

> **Plantilla útil para:** clínicas / salud / servicios locales multi-sede.
> **Estado:** DRAFT · **Email:** ana.rojas@demo.pampai.com

## 1. Resumen ejecutivo
Hoy la demanda se concentra en picos (lunes) y se pierden conversaciones en DM. El plan combina **contenido profesional + ads locales + SLA de WhatsApp** para llenar huecos de agenda.

## 2. Objetivo
Más turnos entre semana atribuibles a Instagram/Google, sin vernos “spammy”.

## 3. Servicios
- Gestión de redes (calendario clínico + UGC pacientes con consentimiento)
- Ads locales (radio + retargeting)
- Diseño del protocolo de leads WhatsApp (etiquetas, horarios, escalamiento)

## 4. Presupuesto
- Fee: **USD 1.200–1.800 / mes**
- Spend: **USD 800–1.500 / mes** (piloto)

## 5. Plazo
Piloto 60 días · 2 sedes · review en día 30 y 60.

## 6. KPIs
- +25% turnos entre semana
- First response DM < 15 min (hábil)
- CPL WhatsApp semanal + % que agenda

## 7. Compliance
Todo copy revisado para evitar promesas médicas. Usar lenguaje de “consulta / evaluación”.

## 8. Próximos pasos
1. Validar tono de marca con dirección.
2. Accesos Meta + GBP.
3. Kickoff recepción (protocolo WhatsApp).

---
*Documento DEMO — plantilla vertical clínicas.*
$md$,
  NULL, 1, 'DRAFT',
  '{"demo":true,"template":"clinicas_locales"}'::jsonb,
  NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
),
(
  'c0a4e004-d000-4000-8000-000000000004',
  'carlos.vega@demo.pampai.com', 'c0a1e001-d000-4000-8000-000000000004',
  'carlos.vega@demo.pampai.com', 'c0a3e003-d000-4000-8000-000000000004',
  'd2fce6f1-d72c-443f-ba3c-be9e80c1082b',
  'Construir inbound B2B predecible vía SEO y contenidos de obra, reduciendo dependencia de referidos.',
  '["SEO y contenidos","Mejoras web / UX de conversión","Opción branding digital"]'::jsonb,
  'Fee USD 1.500–2.400/mes (contrato sugerido 6 meses)',
  '6 meses (SEO compuesto) con quick wins 60 días',
  '["Tráfico orgánico +80% en 6 meses","≥ 8 leads B2B/mes desde orgánico al mes 6","Core Web Vitals en verde","4 vertical landings publicadas"]'::jsonb,
  '["Ciclo de aprobación de socios","Fotos/obras lentas de entregar","SEO no es resultado de 30 días"]'::jsonb,
  '["Hub de obras por vertical","Expectativas educativas al board","Quick wins técnicos + contenido flagship"]'::jsonb,
  'Plantilla B2B industrial/construcción: SEO de mediano plazo con quick wins técnicos y landings verticales.',
  $md$
# Briefing comercial — Vega Obras SA (DEMO)

> **Plantilla útil para:** B2B industrial / construcción / servicios corporativos.
> **Estado:** REVISADO · **Email:** carlos.vega@demo.pampai.com

## 1. Resumen ejecutivo
Vega Obras depende de referidos. El sitio no genera demanda medible. Proponemos un programa de **SEO + contenidos de obra** con quick wins técnicos en 60 días y composición orgánica a 6 meses.

## 2. Objetivo
Leads B2B cualificados (retail / industrial / housing) sin depender solo de la red comercial.

## 3. Servicios sugeridos
- SEO técnico + on-page
- Contenidos (obras, verticales, FAQs de RFP)
- Landings por vertical + CTA de “solicitar visita técnica”
- (Opcional) refresh visual mínimo del sitio

## 4. Presupuesto y plazo
- **USD 1.500–2.400 / mes** · **6 meses** recomendados
- Quick wins: velocidad, indexación, titles, 2 landings piloto

## 5. KPIs
| Horizonte | KPI |
|---|---|
| 60 días | CWV OK + 2 landings + tracking leads |
| 6 meses | Tráfico orgánico +80% · ≥ 8 leads B2B/mes |

## 6. Gobernanza
- Owner de fotos/obras interno
- Aprobación de copy en 5 días hábiles
- Reporte mensual a socios (1 página ejecutiva)

## 7. Próximos pasos
1. Auditoría SEO (semana 1).
2. Priorización de keywords por margen de obra.
3. Kickoff contenidos con jefes de obra.

---
*Documento DEMO — plantilla SEO B2B.*
$md$,
  NULL, 1, 'REVISADO',
  '{"demo":true,"template":"seo_b2b"}'::jsonb,
  NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'
),
(
  'c0a4e004-d000-4000-8000-000000000005',
  'valentina.cruz@demo.pampai.com', 'c0a1e001-d000-4000-8000-000000000007',
  'valentina.cruz@demo.pampai.com', 'c0a3e003-d000-4000-8000-000000000006',
  '9d49d521-1f8f-4de5-8ae1-5a1da441cc4f',
  'Sistema comercial digital de 6 meses con funnels separados B2B (escuelas) y B2C (padres), listo para board.',
  '["Estrategia de marketing 360","Performance ads","SEO y contenidos educativos"]'::jsonb,
  'Fee USD 2.000–3.200/mes + spend diferenciado por funnel',
  '6 meses (board pack incluido)',
  '["Pipeline B2B: 12 oportunidades escuela/trimestre","CAC B2C -15% en 4 meses","2 webinars/mes con show-rate ≥ 40%","One-pager board mensual"]'::jsonb,
  '["Mensajes cruzados entre audiencias","Buy-in CEO depende de claridad del brief","Capacidad interna de CS en picos"]'::jsonb,
  '["Dual-funnel playbook","KPIs separados por audiencia","Brief ejecutivo para directorio"]'::jsonb,
  'Brief listo para directorio EduTech: estrategia 360 con dual funnel. Plantilla premium para pitches a board.',
  $md$
# Briefing comercial — AulaViva (DEMO)

> **Plantilla útil para:** EduTech / dual audience / presentación a board.
> **Estado:** ENVIADO · **Email:** valentina.cruz@demo.pampai.com

## 1. Resumen ejecutivo (board)
AulaViva necesita **un sistema**, no posts sueltos. Separan dos audiencias (escuelas vs padres) con mensajes, creatividades, canales y KPIs distintos bajo una Estrategia 360 de 6 meses.

## 2. Objetivos
- B2B: pipeline predecible de colegios/instituciones.
- B2C: adquisición de padres más eficiente.
- Gobernanza: one-pager mensual para directorio.

## 3. Arquitectura dual funnel
```
B2B escuelas → LinkedIn/contenido authority → demo institucional
B2C padres   → Meta/Google + webinars → trial / pago
```

## 4. Servicios
| Bloque | Incluye |
|---|---|
| Estrategia 360 | Roadmap, mensaje, rituales, board pack |
| Performance | Tests por funnel con techos semanales |
| SEO/contenidos | Proof teachers + guías padres |

## 5. Presupuesto
- Fee Dana: **USD 2.000–3.200 / mes**
- Spend: separado por funnel (recomendación en propuesta económica)

## 6. KPIs (sin overpromise)
- 12 oportunidades B2B / trimestre
- CAC B2C −15% en 4 meses (vs baseline)
- 2 webinars/mes · show-rate ≥ 40%
- Board pack entregado día 5 de cada mes

## 7. Riesgos y controles
- Mezcla de mensajes → brand guidelines por audiencia
- Picos de CS → alertas de capacidad en reporting
- Expectativas irreales → KPIs revisados trimestre 1

## 8. Pedido al board
Aprobar retainer 6 meses + techo de media mes 1–2, con review formal en día 60.

## 9. Próximos pasos
1. Firma de brief.
2. Accesos analytics / ads / CRM.
3. Workshop dual funnel (medio día).
4. Primer board pack (día 30).

---
*Documento DEMO Pampai / Dana MKT — plantilla board-ready.*
$md$,
  NULL, 1, 'ENVIADO',
  '{"demo":true,"template":"edutech_board"}'::jsonb,
  NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours'
);

-- Junction opcional lead_propuestas (si la tabla existe / no rompe si falta)
INSERT INTO lead_propuestas (email, lead_id, propuesta_id, origen, notas)
VALUES
  ('lucia.martinez@demo.pampai.com', 'c0a1e001-d000-4000-8000-000000000001', '40df79e9-a02b-4b9e-be2e-688e37c46d87', 'auto', 'DEMO'),
  ('diego.silva@demo.pampai.com', 'c0a1e001-d000-4000-8000-000000000002', '9d49d521-1f8f-4de5-8ae1-5a1da441cc4f', 'manual', 'DEMO'),
  ('ana.rojas@demo.pampai.com', 'c0a1e001-d000-4000-8000-000000000003', 'd935cc0b-fb26-4b1c-8dca-61e207076594', 'auto', 'DEMO'),
  ('carlos.vega@demo.pampai.com', 'c0a1e001-d000-4000-8000-000000000004', 'd2fce6f1-d72c-443f-ba3c-be9e80c1082b', 'auto', 'DEMO'),
  ('sofia.nguyen@demo.pampai.com', 'c0a1e001-d000-4000-8000-000000000005', '40df79e9-a02b-4b9e-be2e-688e37c46d87', 'auto', 'DEMO'),
  ('martin.lopez@demo.pampai.com', 'c0a1e001-d000-4000-8000-000000000006', '856d1afc-17fe-452a-b27f-fbc961973aa1', 'manual', 'DEMO'),
  ('valentina.cruz@demo.pampai.com', 'c0a1e001-d000-4000-8000-000000000007', '9d49d521-1f8f-4de5-8ae1-5a1da441cc4f', 'auto', 'DEMO')
ON CONFLICT (email, propuesta_id) DO UPDATE
SET notas = EXCLUDED.notas, updated_at = NOW();

COMMIT;

-- Verificación
SELECT 'leads' AS tabla, count(*)::int AS n FROM leads WHERE email ILIKE '%@demo.pampai.com'
UNION ALL SELECT 'perfiles', count(*)::int FROM perfiles WHERE email ILIKE '%@demo.pampai.com'
UNION ALL SELECT 'reuniones', count(*)::int FROM reuniones WHERE lead_email ILIKE '%@demo.pampai.com'
UNION ALL SELECT 'briefings', count(*)::int FROM briefings WHERE lead_email ILIKE '%@demo.pampai.com'
UNION ALL SELECT 'lead_propuestas', count(*)::int FROM lead_propuestas WHERE email ILIKE '%@demo.pampai.com';
