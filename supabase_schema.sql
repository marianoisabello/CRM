-- ═══════════════════════════════════════════════════════════════
-- CRM Dana — Schema completo
-- Ejecutar en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════

-- ─── Leads ──────────────────────────────────────────────────────
-- Crear tabla si no existe (instalación nueva)
create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,
  external_id text,
  name        text,
  contact     text,
  contact_type text,
  email       text,
  message     text,
  status      text not null default 'new',
  raw_payload jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Migración: agregar columnas nuevas si la tabla ya existía
alter table leads add column if not exists score          int;
alter table leads add column if not exists classification  text;
alter table leads add column if not exists next_action    text;
alter table leads add column if not exists sdr_notes      text;
alter table leads add column if not exists diagnosis      jsonb;
alter table leads add column if not exists proposal       jsonb;
alter table leads add column if not exists proposal_status text;

-- Actualizar check constraints (drop + add para manejar ambos casos)
alter table leads drop constraint if exists leads_contact_type_check;
alter table leads add constraint leads_contact_type_check
  check (contact_type in ('phone', 'instagram_handle', 'email', 'linkedin_profile'));

alter table leads drop constraint if exists leads_status_check;
alter table leads add constraint leads_status_check
  check (status in ('new', 'contacted', 'qualified', 'lost', 'won'));

alter table leads drop constraint if exists leads_score_check;
alter table leads add constraint leads_score_check
  check (score >= 0 and score <= 100);

alter table leads drop constraint if exists leads_classification_check;
alter table leads add constraint leads_classification_check
  check (classification in ('hot', 'warm', 'cold', 'unqualified'));

alter table leads drop constraint if exists leads_next_action_check;
alter table leads add constraint leads_next_action_check
  check (next_action in ('schedule_meeting', 'send_info', 'nurture', 'discard'));

alter table leads drop constraint if exists leads_proposal_status_check;
alter table leads add constraint leads_proposal_status_check
  check (proposal_status in ('pending_approval', 'approved', 'sent', 'rejected'));

create unique index if not exists leads_source_external_id
  on leads (source, external_id)
  where external_id is not null;

create index if not exists leads_classification on leads (classification);
create index if not exists leads_status on leads (status);
create index if not exists leads_created_at on leads (created_at desc);

-- ─── Ingest Events ──────────────────────────────────────────────
create table if not exists ingest_events (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,
  raw_payload jsonb not null,
  processed   boolean not null default false,
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists ingest_events_unprocessed
  on ingest_events (processed, created_at)
  where processed = false;

-- ─── Meetings ───────────────────────────────────────────────────
create table if not exists meetings (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references leads(id) on delete cascade,
  scheduled_at  timestamptz not null,
  type          text not null default 'discovery'
                check (type in ('discovery', 'follow_up', 'closing', 'onboarding')),
  status        text not null default 'scheduled'
                check (status in ('scheduled', 'completed', 'no_show', 'cancelled')),
  notes         text,
  calendar_link text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists meetings_lead_id on meetings (lead_id);

-- ─── Clients ────────────────────────────────────────────────────
create table if not exists clients (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid references leads(id),
  company         text,
  monthly_budget  numeric(12,2),
  services        text[] default '{}',
  status          text not null default 'active'
                  check (status in ('active', 'paused', 'churned')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Performance Reports (Agente 04) ────────────────────────────
create table if not exists performance_reports (
  id                       uuid primary key default gen_random_uuid(),
  client_id                uuid references clients(id),
  period_since             date not null,
  period_until             date not null,
  analysis                 jsonb not null,
  actions_pending_approval jsonb default '[]',
  status                   text not null default 'done'
                           check (status in ('done', 'pending_approval', 'approved')),
  approved_at              timestamptz,
  created_at               timestamptz not null default now()
);

create index if not exists perf_reports_client on performance_reports (client_id, period_since desc);

-- ─── Monthly Reports (Agente 05) ────────────────────────────────
create table if not exists monthly_reports (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id),
  month       text not null,   -- YYYY-MM
  report      jsonb not null,
  status      text not null default 'pending_approval'
              check (status in ('pending_approval', 'approved', 'sent')),
  approved_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (client_id, month)
);

-- ─── Agent Runs ─────────────────────────────────────────────────
create table if not exists agent_runs (
  id          uuid primary key default gen_random_uuid(),
  agent_id    text not null,   -- 'sdr' | 'analyst' | 'proposal' | 'performance' | 'reporting'
  lead_id     uuid references leads(id) on delete set null,
  input_data  jsonb default '{}',
  output_data jsonb,
  tokens_used int,
  duration_ms int,
  status      text not null default 'running'
              check (status in ('running', 'completed', 'failed')),
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists agent_runs_agent_id on agent_runs (agent_id, created_at desc);
create index if not exists agent_runs_lead_id on agent_runs (lead_id);

-- ─── Trigger updated_at ─────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  create trigger leads_updated_at before update on leads
    for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger meetings_updated_at before update on meetings
    for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger clients_updated_at before update on clients
    for each row execute function update_updated_at();
exception when duplicate_object then null; end $$;
