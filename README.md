# CRM Leads

CRM propio que unifica leads de múltiples fuentes en un solo endpoint de ingesta.

## Setup rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus credenciales de Supabase
```

### 3. Crear tablas en Supabase
Ir al SQL Editor de tu proyecto en Supabase y ejecutar el contenido de `supabase_schema.sql`.

### 4. Correr el servidor
```bash
npm run dev   # desarrollo (con nodemon)
npm start     # producción
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/leads/ingest?source=<source>` | Ingesta de leads |
| POST | `/api/leads/reprocess` | Reprocesar eventos fallidos |

## Fuentes soportadas

| `source` | Descripción |
|----------|-------------|
| `web_form` | Formulario web (Tally, Typeform, propio) |
| `instagram` | Instagram DM — Instagram Graph API o ManyChat |
| `linkedin` | LinkedIn Lead Gen Forms (via Zapier/Make) |
| `email` | Email inbound — Mailgun, SendGrid, Postmark, Gmail via Zapier |
| `whatsapp` | WhatsApp Cloud API (Meta) |
| `database_import` | Importación desde bases de datos o CRMs existentes |
| `manychat` | ManyChat External Request (útil para IG + WA sin app review propio) |

## Ejemplo: formulario web

```bash
curl -X POST "http://localhost:3000/api/leads/ingest?source=web_form" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Pérez",
    "email": "juan@ejemplo.com",
    "phone": "+5491112345678",
    "message": "Quiero información sobre el servicio"
  }'
```

Respuesta exitosa:
```json
{
  "ok": true,
  "lead_id": "uuid-del-lead",
  "created": true,
  "event_id": "uuid-del-evento"
}
```

## Ejemplo: ManyChat

En ManyChat, configurar una acción **External Request**:
- URL: `https://tu-servidor.com/api/leads/ingest?source=manychat`
- Método: POST
- Body:
```json
{
  "external_id": "{{user_id}}",
  "name": "{{first_name}} {{last_name}}",
  "contact": "{{phone}}",
  "contact_type": "phone",
  "message": "{{last_input_text}}"
}
```

## Flujo de ingesta

```
POST /api/leads/ingest
        │
        ▼
  Guardar IngestEvent (crudo)   ← siempre, antes de todo
        │
        ▼
  Normalizar según source
        │
      ┌─┴─────────────┐
    OK │               │ ERROR
        ▼               ▼
  Upsert Lead    Marcar error en
  markProcessed  IngestEvent
        │               │
        └──────┬────────┘
               ▼
         Responder 200
```

> El servidor siempre devuelve 200 (salvo errores de validación) para evitar reintentos infinitos de fuentes externas. Si la normalización falla, el dato crudo queda guardado para reprocesamiento manual con `POST /api/leads/reprocess`.
