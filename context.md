# CRM Dana — Contexto del Proyecto

## Vision general

CRM Dana es el sistema operativo de Marketing Dana. Una plataforma con 5 agentes IA que automatizan la calificacion de leads, el diagnostico post-reunion, la generacion de propuestas y el reporting de campanas. Todos los agentes leen y escriben sobre la misma base de datos.

**Stack:** Node.js + Express, Supabase (Postgres), Anthropic SDK (claude-opus-4-6), Winston, node-cron.

---

## Estructura de archivos

```
/lead-scoring-chatbot  - Chatbot React (deployado en chatbot-pampai-nu.vercel.app)
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

### 02 Analista — Diagnostico post-reunion
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

# Google Ads
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=
```

---

## Deployment

- **CRM (backend + frontend SPA):** Vercel project `crm` — https://crm-murex-tau.vercel.app (repo root `.`, Express)
- **Chatbot standalone (opcional):** Vercel project `chatbot-pampai` — https://chatbot-pampai-nu.vercel.app (rootDirectory `lead-scoring-chatbot/`) — **no borrar** sin confirmación; el CRM ya hospeda una copia en `/chatbox/`
- **GitHub:** https://github.com/marianoisabello/CRM
- **Requisito Railway (legacy):** `NIXPACKS_NODE_VERSION=22` — ya no aplica si se usa Vercel
- **Credenciales seed:** admin@dana.com / Dana2024!

### Chatbot Lead Scoring (`/lead-scoring-chatbot`)

- **Stack:** React 18 + Vite + Tailwind CSS + Supabase JS
- **En CRM (unificado):** https://crm-murex-tau.vercel.app/app.html#chatbox → iframe a `/chatbox/` (mismo dominio)
- **Standalone:** https://chatbot-pampai-nu.vercel.app
- **Build CRM:** `npm run build:chatbox` → `public/chatbox/` (base `/chatbox/`)
- **Flujo:** 10 preguntas de datos → 6 preguntas Sí/No → score 0-100 → mensaje personalizado → guarda en tabla `leads` con `source: "chatbot"`
- **Scoring:** negocio activo (+10), web/social activa (+10), necesidad urgente (+20), presupuesto (+20), tomador de decisiones (+20), resultados corto plazo (+20)
- **Categorias:** Bajo (0-39), Medio (40-69), Alto (70-100)
- **Calendly (Alto):** https://calendly.com/marianoisabello-pampai/30min
- **Link en sidebar CRM:** Herramientas (expandible) → **Chatbox** (vista in-app `#chatbox`)
- **Chatbot UI:** página standalone sin sidebar CRM — el menú Marketing Dana vive solo en el CRM
- **Tabla leads:** ya creada en Supabase — los leads del chatbot llegan con source="chatbot"

### Pasos pendientes para funcionar completamente

1. **Tabla users en Supabase** — correr el bloque `-- ─── Users ───` del `supabase_schema.sql` en el SQL Editor
2. **Seed:** `node scripts/seed.js` (crea admin + 15 leads de demo)
3. **Vercel vars (CRM):** agregar `JWT_SECRET`, `TZ=America/Argentina/Buenos_Aires`
4. **Google Sheets:** crear Service Account, habilitar API, poner credenciales como `GOOGLE_SHEETS_SA_KEY`
5. **ManyChat webhook:** reconectar el External Request block al endpoint de ingesta

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
| Google Sheets | Exportar leads | Service Account pendiente |
