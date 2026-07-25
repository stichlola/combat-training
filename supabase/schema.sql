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

-- ============ PREMIUM (freemium) ============
-- Il client può solo LEGGERE il proprio stato; la scrittura avviene
-- esclusivamente dal serverless con la service role key dopo pagamento verificato.
create table if not exists public.premium (
  user_id uuid primary key references auth.users(id) on delete cascade,
  premium_until timestamptz,
  last_order_id text,
  updated_at timestamptz default now()
);
alter table public.premium enable row level security;
drop policy if exists "read own premium" on public.premium;
create policy "read own premium" on public.premium
  for select using (auth.uid() = user_id);
-- NESSUNA policy di insert/update per gli utenti: è voluto.

alter table public.user_data add column if not exists quests jsonb;
alter table public.user_data add column if not exists stats jsonb;

-- ============ USAGE (limiti settimanali + crediti) ============
create table if not exists public.usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  week text,
  import_n integer default 0,
  nutrition_n integer default 0,
  scan_n integer default 0,
  workout_n integer default 0,
  credits integer default 0,
  last_order_id text,
  updated_at timestamptz default now()
);
alter table public.usage enable row level security;
drop policy if exists "read own usage" on public.usage;
create policy "read own usage" on public.usage
  for select using (auth.uid() = user_id);
-- nessuna policy di scrittura per gli utenti: scrive solo il serverless.

alter table public.usage add column if not exists workout_n integer default 0;
