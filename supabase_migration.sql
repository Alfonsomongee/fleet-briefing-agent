-- Fleet Briefing Agent — Supabase schema
-- Run this in the Supabase SQL editor

create table if not exists public.briefings (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  city        text not null,
  resumen     text,
  alertas     jsonb default '[]',
  recomendacion text,
  prioridad   text check (prioridad in ('alta', 'media', 'baja', 'desconocida')),
  kpis_today  jsonb default '{}',
  kpis_baseline jsonb default '{}',
  anomalies   jsonb default '[]',
  anomalies_count int default 0,
  created_at  timestamptz default now(),
  unique (date, city)
);

-- Index for fast lookups by date
create index if not exists briefings_date_idx on public.briefings (date desc);

-- Row-level security (read-only public access for the dashboard)
alter table public.briefings enable row level security;

create policy "Public read access"
  on public.briefings for select
  using (true);

create policy "Service role write access"
  on public.briefings for insert
  with check (auth.role() = 'service_role');

create policy "Service role upsert access"
  on public.briefings for update
  using (auth.role() = 'service_role');
