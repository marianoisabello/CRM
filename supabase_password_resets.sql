-- Tokens de un solo uso para restablecer contraseña.
-- El CRM usa la service role, que salta RLS. No hay políticas para anon/authenticated.

create table if not exists password_resets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists password_resets_user_created_idx
  on password_resets (user_id, created_at desc);

alter table password_resets enable row level security;
