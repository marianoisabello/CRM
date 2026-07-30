# CRM Dana — Contexto del Proyecto

## Vision general

CRM Dana es el sistema operativo de Marketing Dana. Una plataforma con 5 agentes IA que automatizan la calificacion de leads, el diagnostico post-reunion, la generacion de propuestas y el reporting de campanas. Todos los agentes leen y escriben sobre la misma base de datos.

**Stack:** Node.js + Express, Supabase (Postgres), Anthropic SDK (claude-opus-4-6), Winston, node-cron.

---

## Estructura de archivos

```
/lead-scoring-chatbot  - Chatbot React (build → public/chatbox/ en deploy CRM)
  /src
    /components/       - ChatBot.tsx, ScoreDisplay.tsx, SuccessMessage.tsx
    /services/         - supabaseClient.ts
    /types/            - lead.ts

/src
  /agents/          - Los 5 agentes IA
  /db/              - Operaciones CRUD contra Supabase
  /routes/          - Endpoints Express
  /integrations/    - Claude, Google Calendar, Meta Ads, Google Ads
  /normalizers/     - Parsers de payload por fuente de lead
  /prompts/         - System prompts de cada agente (.txt)
  /scoring/         - Scoring deterministico de leads
  /lib/             - Utilities (logger, retry, agentRun tracker)
  /middleware/      - JWT auth middleware
  /jobs/            - Cron jobs (followups, ads, reportes)
  server.js         - Entry point Express
  config.js         - Variables de entorno

/public             - Frontend SPA (vanilla JS + Tailwind)
  /js
    api.js          - Fetch wrapper con auth
    components.js   - Helpers de UI compartidos
    /views/         - dashboard, leads, calendar, agent, settings

/scripts
  seed.js           - Crea admin user + 15 leads de demo

supabase_schema.sql - Schema completo de la DB
.env.example        - Plantilla de variables de entorno
```

---

## Los 5 agentes

### 01 SDR — Calificacion de leads
- **Trigger:** automatico en background tras cada ingesta de lead
- **Flujo:** scoring deterministico (0-100) → Claude AI → clasifica Hot/Warm/Cold/Unqualified
- **Scoring deterministico:** fuente (+5-20), email (+10), telefono (+15), nombre (+5), largo del mensaje (+5-20), keywords de intencion (+15)
- **Output:** score, classification, next_action, first_message, follow_up_days
- **Endpoint manual:** `POST /api/agent-runs/sdr`

### 02 Analista (Perfiles) — Enriquecimiento de leads
- **Archivo:** `src/agents/perfiles.js`
- **Trigger:** batch via `POST /api/hooks/perfiles-run` (header `x-crm-internal-key`) o manual
- **Flujo:**
  1. Lee leads calificados de Supabase (score ≥ 40 o categoria HOT/WARM/CALIENTE/TIBIO)
  2. Research en paralelo: scrape del sitio web del lead + búsqueda web
  3. Llama a Claude con datos del lead + research + catálogo de servicios (tabla `propuestas`)
  4. Upsert en tabla `perfiles` con perfil enriquecido
- **Research lib:** `src/lib/research.js` — scrape HTML propio + búsqueda con Serper → Tavily → Google CSE → DuckDuckGo (fallback en cadena)
- **Output:** cargo_inferido, tamanio_inferido, pain_points[], servicios_recomendados[], oferta_estimada, score_potencial (0-100), razones
- **Preserva:** asignación manual de propuesta (`propuesta_origen: 'manual'`) en re-enriquecimientos
- **Hook n8n:** `POST /api/hooks/research` — mismo source of truth, para que n8n pueda llamar al research directamente

### 02b Analista — Diagnostico post-reunion (legacy)
- **Trigger:** manual via `POST /api/diagnosis`
- **Input:** lead + notas de reunion de discovery
- **Output:** situation_summary, opportunities[], priorities[], pending_questions[], dana_fit (High/Medium/Low)
- **Requisito:** el lead debe existir (cualquier status)

### 03 Propuesta — Propuesta comercial
- **Trigger:** manual via `POST /api/proposals`
- **Input:** lead + diagnostico + notas de llamada + presupuesto estimado
- **Requisito:** el lead debe tener diagnostico previo
- **Output:** services_recommended, investment_range, expected_results, next_steps, onboarding_plan
- **Status flow:** `pending_approval` → (revision humana) → `approved` → `sent`

### 04 Performance — Analisis de campanas
- **Trigger:** cron lunes 8AM o manual via `POST /api/campaigns/analyze`
- **Fuentes:** Meta Ads API + Google Ads API (fetch en paralelo)
- **Output:** performance_summary, alerts[], recommendations[], actions_pending_approval[]
- **Principio:** las acciones (pausar campana, reasignar presupuesto) requieren aprobacion humana

### 05 Reporting — Reportes mensuales por cliente
- **Trigger:** cron dia 1 de cada mes 7AM o manual via `POST /api/reports/monthly`
- **Input:** metricas mes actual + mes anterior + notas del equipo
- **Output:** headline, key_metrics (con % vs anterior), wins, explanations, next_month_plan
- **Status flow:** `pending_approval` → `approved` → `sent`

---

## API — Rutas principales

### Publicas (sin JWT)
```
GET  /health
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/google-calendar    # OAuth flow
GET  /api/auth/google-callback    # OAuth callback
POST /api/leads/ingest?source=<s> # Webhook de todas las fuentes
POST /api/leads/reprocess         # Re-procesar eventos fallidos
POST /api/whatsapp/webhook        # Webhook de Whapi.Cloud — bot de WhatsApp directo
```

### Protegidas (requieren JWT)
```
GET   /api/auth/me
GET   /api/leads                  # ?classification=&status=&source=&limit=&offset=
PATCH /api/leads/:id/status
GET   /api/leads/stats            # KPIs del dashboard

GET   /api/meetings
POST  /api/meetings
PATCH /api/meetings/:id/status

POST  /api/diagnosis              # Trigger Agente 02
GET   /api/diagnosis/:lead_id

POST  /api/proposals              # Trigger Agente 03
GET   /api/proposals/:lead_id
POST  /api/proposals/:lead_id/approve

POST  /api/campaigns/analyze      # Trigger Agente 04
POST  /api/campaigns/reports/:id/approve

POST  /api/reports/monthly        # Trigger Agente 05
POST  /api/reports/:id/approve

GET   /api/agent-runs             # Historial de ejecuciones
POST  /api/agent-runs/:agent      # Trigger manual de cualquier agente

POST  /api/export/sheets          # Exportar leads a Google Sheets

# Catálogo de propuestas (requiere auth)
GET   /api/propuestas             # ?activo=true&q=<nombre>
GET   /api/propuestas/:id
POST  /api/propuestas             # Crear propuesta
PATCH /api/propuestas/:id         # Editar propuesta
DELETE /api/propuestas/:id        # Soft-delete (activo=false) o ?hard=1 para borrar
POST  /api/propuestas/assign      # Asignar propuesta a un perfil (body: email, propuesta_id, origen, notas)
DELETE /api/propuestas/assign     # Des-asignar propuesta de un perfil
GET   /api/propuestas/by-lead/:email  # Propuesta activa + historial de asignaciones

# Hooks internos (header x-crm-internal-key, sin JWT)
POST  /api/hooks/perfiles-run    # Trigger batch Agente Perfiles (para n8n)
POST  /api/hooks/research        # Research scrape+search de un lead (para n8n)
```

---

## Flujo de ingesta de leads

```
Fuente externa → POST /api/leads/ingest?source=manychat
  1. Verificacion de firma HMAC (si es ManyChat)
  2. Guardado raw en ingest_events
  3. Normalizacion del payload (normalizer por fuente)
  4. Upsert del lead (por source + external_id)
  5. Respuesta inmediata al webhook (no bloquea)
  6. SDR Agent en background:
     - Scoring deterministico
     - Llamada a Claude API
     - Update lead: score, classification, next_action
```

**Fuentes soportadas:** web_form, manychat, instagram, whatsapp, linkedin, email, database_import

---

## Bot de WhatsApp directo (Whapi.Cloud)

Alternativa a ManyChat que **no depende de la verificación de Meta**. Usa [Whapi.Cloud](https://whapi.cloud) (linkea el WhatsApp vía QR, sin aprobación de Meta Business).

- **Archivos:** `src/integrations/whapi.js` (envío de mensajes), `src/agents/whatsappBot.js` (máquina de estados de la conversación), `src/routes/whatsappBot.js` (webhook), `src/db/whatsappConversations.js` (estado por número)
- **Endpoint:** `POST /api/whatsapp/webhook` — público, registrado en el panel de Whapi
- **Trigger:** mensaje entrante sin conversación activa que contenga alguna de las `WHATSAPP_BOT_TRIGGER_KEYWORDS` (default: informacion, información, info, quiero saber, dana mkt, dana marketing) — ej. "Quiero mas informacion sobre DANA MKT" activa el flujo
- **Flujo:** mismas 16 preguntas que `lead-scoring-chatbot` (10 de datos + 6 Sí/No), conversación guardada en tabla `whatsapp_conversations` (una activa por teléfono)
- **Al terminar:** crea/actualiza el Lead (`source: 'whatsapp'`) y dispara el Agente SDR existente (fuente de verdad de score/classification) — responde en WhatsApp con mensaje final según `hot/warm/cold`, con link de Calendly si es hot
- **Estado:** código listo, pendiente configurar `WHAPI_TOKEN` (crear canal en panel.whapi.cloud, escanear QR) y registrar el webhook

---

## Schema de DB (tablas principales)

| Tabla | Proposito |
|-------|-----------|
| `leads` | Registro central: score, classification, diagnosis (JSONB), proposal (JSONB) |
| `ingest_events` | Cola de payloads crudos (processed: bool) |
| `meetings` | Reuniones vinculadas a leads, con calendar_link |
| `clients` | Clientes activos, budget mensual, servicios contratados |
| `performance_reports` | Reportes de campanas con actions_pending_approval |
| `monthly_reports` | Reportes mensuales por cliente (unique: client_id + month) |
| `agent_runs` | Auditoria: cada ejecucion de agente con tokens_used, duration_ms |
| `users` | Usuarios del CRM (admin/viewer), bcrypt password |
| `perfiles` | Perfiles enriquecidos por el Agente Analista: pain_points, servicios_recomendados, oferta_estimada, score_potencial, research_context (JSONB). Unique: email |
| `propuestas` | Catalogo de servicios/propuestas de Dana: nombre, descripcion, precio_min, precio_max, moneda, tags[], rubros[], activo. Usado por Agente Perfiles como contexto |
| `lead_propuestas` | Junction table: asignaciones de propuestas a leads. Unique: email + propuesta_id. Registra origen (manual/auto) y notas |
| `whatsapp_conversations` | Estado del bot de WhatsApp directo (Whapi): phone, step, answers (JSONB), status (active/completed/abandoned). Única conversación activa por teléfono |

---

## Frontend (SPA vanilla JS)

- **app.html** — contenedor con sidebar y navegacion
- **login.html** — formulario email/password
- **api.js** — wrapper fetch que adjunta JWT automaticamente, redirige a login si 401
- **components.js** — helpers compartidos: scoreBar, classificationBadge, renderLeadsTable, fmtDate

**Vistas:**
- `dashboard.js` — KPIs, pipeline, distribucion por fuente, ultimos 5 leads
- `leads.js` — tabla filtrable (classification, status, source), paginacion, exportar a Sheets
- `calendar.js` — reuniones agendadas
- `agent.js` — historial de ejecuciones de agentes
- `settings.js` — perfil de usuario, integraciones

---

## Principios de diseno

1. **IngestEvent primero** — todo payload crudo se guarda antes de procesarse
2. **SDR siempre en background** — no bloquea la respuesta HTTP del webhook
3. **Aprobacion humana para acciones irreversibles** — propuestas, acciones en campanas y reportes siempre pasan por `/approve`
4. **Jobs cron solo en produccion** — o con `START_JOBS=true`
5. **Canal ManyChat** — no mensajeria directa Meta (en verificacion); ManyChat maneja WA + Instagram

---

## Variables de entorno necesarias

```env
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Server
PORT=3000
NODE_ENV=production
TZ=America/Argentina/Buenos_Aires   # pendiente en Railway

# AI
ANTHROPIC_API_KEY=
AI_DEFAULT_MODEL=claude-opus-4-6

# Auth
JWT_SECRET=                         # pendiente en Railway (usar openssl rand -hex 32)

# Google Calendar / Sheets (OAuth)
CALENDAR_PROVIDER=google
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REFRESH_TOKEN=      # se obtiene via /api/auth/google-callback

# Meta Ads
META_ADS_ACCESS_TOKEN=
META_ADS_ACCOUNT_ID=
META_APP_SECRET=

# ManyChat
MANYCHAT_WEBHOOK_SECRET=

# Whapi.Cloud (bot de WhatsApp directo)
WHAPI_TOKEN=                        # pendiente — crear canal en panel.whapi.cloud
WHAPI_BASE_URL=https://gate.whapi.cloud
WHATSAPP_BOT_TRIGGER_KEYWORDS=informacion,información,info,quiero saber,dana mkt,dana marketing

# Google Ads
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=
```

---

## Deployment

- **CRM (backend + frontend SPA + chatbox):** Vercel project `crm` — https://crm-murex-tau.vercel.app (repo root `.`, Express)
- **Chatbot unificado:** `postinstall` (gated by `VERCEL=1`) corre `npm run build:chatbox` porque legacy `builds` ignora `installCommand`/`buildCommand`; Vite bakea en `public/chatbox/` con `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- **Chatbot standalone (legacy, opcional):** Vercel project `chatbot-pampai` — https://chatbot-pampai-nu.vercel.app — **no borrar** sin confirmación; se puede redirigir a CRM `/chatbox/` o eliminar después
- **GitHub:** https://github.com/marianoisabello/CRM
- **Credenciales seed:** admin@dana.com / Dana2024!

### Chatbot Lead Scoring (`/lead-scoring-chatbot`)

- **Stack:** React 18 + Vite + Tailwind CSS + Supabase JS
- **En CRM (unificado):** https://crm-murex-tau.vercel.app/app.html#chatbox → iframe same-origin `/chatbox/`
- **Standalone (legacy):** https://chatbot-pampai-nu.vercel.app — redirect a CRM `/chatbox/` pendiente (vercel.json redirects no activaron en el último deploy); **no borrar** el project `chatbot-pampai` sin confirmación del usuario
- **Build CRM:** `npm run build:chatbox` → `public/chatbox/` (Vite `base: '/chatbox/'`)
- **Flujo:** 10 preguntas de datos → 6 preguntas Sí/No → score 0-100 → mensaje personalizado → guarda en tabla `leads` con `source: "chatbot"`
- **Preguntas de info (10):** nombre_apellido, empresa, cargo, email, whatsapp, web_sitio, red_social, tamaño_negocio, pais_ciudad, objetivo_necesidad
- **Preguntas de scoring (6 Sí/No):**
  1. ¿Tenés un negocio activo? (+10)
  2. ¿Tenés presupuesto disponible? (+20)
  3. ¿Tomás decisiones de compra? (+20)
  4. ¿Necesidad real y urgente? (+20)
  5. ¿Trabajás con proveedores o todo interno? (sin puntaje directo)
  6. ¿Buscás resultados a corto plazo? (+20)
  - **Bonus:** tener web/social activa (+10)
- **Scoring total:** 0-100 puntos
- **Categorias:** Bajo (0-39), Medio (40-69), Alto (70-100)
- **Mensajes por categoria:**
  - Alto → invita a agendar reunión + botón Calendly
  - Medio → promete newsletter y seguimiento
  - Bajo → material educativo, re-contactar en 3-6 meses
- **Calendly (Alto):** https://calendly.com/marianoisabello-pampai/30min
- **Link en sidebar CRM:** Herramientas (expandible) → **Chatbox** (vista in-app `#chatbox`)
- **Chatbot UI:** página standalone sin sidebar CRM — el menú Marketing Dana vive solo en el CRM
- **Tabla leads:** ya creada en Supabase — los leads del chatbot llegan con source="chatbot"
- **UX:** barra de progreso, typing indicator animado, ScoreDisplay con resumen antes de confirmar, SuccessMessage tras guardado exitoso

### Pasos pendientes para funcionar completamente

1. **Tabla users en Supabase** — correr el bloque `-- ─── Users ───` del `supabase_schema.sql` en el SQL Editor
2. **Seed:** `node scripts/seed.js` (crea admin + 15 leads de demo)
3. **Vercel vars (CRM):** agregar `JWT_SECRET`, `TZ=America/Argentina/Buenos_Aires`
4. **Google Sheets:** crear Service Account, habilitar API, poner credenciales como `GOOGLE_SHEETS_SA_KEY`
5. **ManyChat webhook:** reconectar el External Request block al endpoint de ingesta
6. **Whapi.Cloud:** crear canal en panel.whapi.cloud, escanear QR, poner `WHAPI_TOKEN`, y registrar `POST /api/whatsapp/webhook` como webhook (evento `messages`) para activar el bot directo

---

## Integraciones externas

| Servicio | Uso | Estado |
|----------|-----|--------|
| Anthropic Claude | Motor de todos los agentes | Configurado |
| Supabase | DB + auth backend | Configurado |
| Google Calendar | Crear eventos y Meet URLs | OAuth pendiente |
| Meta Ads API | Leer metricas de campanas | Token pendiente |
| Google Ads API | Leer metricas de campanas | Credenciales pendientes |
| ManyChat | Webhook de leads WA + IG | Webhook desconectado |
| Whapi.Cloud | Bot de calificación directo por WhatsApp | Código listo, falta WHAPI_TOKEN |
| Google Sheets | Exportar leads | Service Account pendiente |
