-- =========================================================
-- GYMQUEST — Schema database Supabase
-- Esegui questo script in: Supabase Dashboard > SQL Editor
-- =========================================================

-- Tabella unica per i dati utente (JSONB: semplice e flessibile)
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  body       jsonb,          -- dati corporei (peso, altezza, misure...)
  nutrition  jsonb,          -- piano nutrizionale generato
  routines   jsonb,          -- schede di allenamento
  prs        jsonb,          -- personal records
  xp         integer default 0,
  level      integer default 1,
  streak     integer default 0,
  updated_at timestamptz default now()
);

-- Row Level Security: ogni utente vede e modifica SOLO i propri dati
alter table public.user_data enable row level security;

create policy "Utenti leggono i propri dati"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "Utenti inseriscono i propri dati"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "Utenti aggiornano i propri dati"
  on public.user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Migrazione per database esistenti (esegui se la tabella era già creata):
alter table public.user_data add column if not exists session jsonb;
alter table public.user_data add column if not exists history jsonb;
