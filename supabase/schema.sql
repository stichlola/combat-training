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

-- ============ CODICI DI RISCATTO (acquisto senza account) ============
create table if not exists public.redeem_codes (
  code text primary key,
  product text not null,
  order_id text,
  used_by uuid references auth.users(id),
  used_at timestamptz,
  created_at timestamptz default now()
);
alter table public.redeem_codes enable row level security;
-- nessuna policy: la tabella è accessibile SOLO dal serverless (service role)

-- ============ PERSONAL TRAINER (v2 — ri-eseguibile) ============
-- Ruoli: "user" (default, atleta) o "pt". Per promuovere un account:
--   update public.profiles set role = 'pt' where id = '<uuid-utente>';
-- (la riga in profiles viene creata automaticamente dall'app al primo login)

-- 1) TABELLE
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null default 'user' check (role in ('user', 'pt')),
  display_name text,
  created_at   timestamptz default now()
);
alter table public.profiles enable row level security;

create table if not exists public.trainer_clients (
  trainer_id   uuid not null references auth.users(id) on delete cascade,
  client_id    uuid not null references auth.users(id) on delete cascade,
  client_email text,
  note         text default '',
  created_at   timestamptz default now(),
  primary key (trainer_id, client_id)
);
alter table public.trainer_clients enable row level security;

-- 2) POLICY profiles
drop policy if exists "Utenti leggono il proprio profilo" on public.profiles;
create policy "Utenti leggono il proprio profilo"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Il PT legge i profili dei suoi clienti" on public.profiles;
create policy "Il PT legge i profili dei suoi clienti"
  on public.profiles for select
  using (exists (
    select 1 from public.trainer_clients tc
    where tc.trainer_id = auth.uid() and tc.client_id = id
  ));

drop policy if exists "Utenti creano il proprio profilo" on public.profiles;
create policy "Utenti creano il proprio profilo"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Utenti aggiornano il proprio profilo" on public.profiles;
create policy "Utenti aggiornano il proprio profilo"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3) POLICY trainer_clients
drop policy if exists "Il PT vede i propri clienti" on public.trainer_clients;
create policy "Il PT vede i propri clienti"
  on public.trainer_clients for select
  using (auth.uid() = trainer_id);

drop policy if exists "Il PT aggiorna i propri clienti (note)" on public.trainer_clients;
create policy "Il PT aggiorna i propri clienti (note)"
  on public.trainer_clients for update
  using (auth.uid() = trainer_id)
  with check (auth.uid() = trainer_id);

drop policy if exists "Il PT rimuove i propri clienti" on public.trainer_clients;
create policy "Il PT rimuove i propri clienti"
  on public.trainer_clients for delete
  using (auth.uid() = trainer_id);

drop policy if exists "Il cliente vede i propri PT" on public.trainer_clients;
create policy "Il cliente vede i propri PT"
  on public.trainer_clients for select
  using (auth.uid() = client_id);

drop policy if exists "Il cliente si collega a un PT" on public.trainer_clients;
create policy "Il cliente si collega a un PT"
  on public.trainer_clients for insert
  with check (auth.uid() = client_id);

drop policy if exists "Il cliente si scollega da un PT" on public.trainer_clients;
create policy "Il cliente si scollega da un PT"
  on public.trainer_clients for delete
  using (auth.uid() = client_id);

-- 4) POLICY user_data — PREDISPOSIZIONE: il PT legge le schede dei clienti.
-- La policy di UPDATE (modifica diretta) verrà aggiunta in seguito.
drop policy if exists "Il PT legge i dati dei propri clienti" on public.user_data;
create policy "Il PT legge i dati dei propri clienti"
  on public.user_data for select
  using (exists (
    select 1 from public.trainer_clients tc
    where tc.trainer_id = auth.uid() and tc.client_id = user_data.user_id
  ));

-- ============================================================
-- RICHIESTE PT + AMMINISTRATORE (v3)
-- L'utente chiede di diventare PT; l'admin approva o rifiuta.
-- L'admin è riconosciuto via email dell'account (JWT).
-- ============================================================

-- 1) TABELLA pt_requests
create table if not exists public.pt_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  message text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

alter table public.pt_requests enable row level security;

-- 2) POLICY pt_requests
-- L'utente crea solo la propria richiesta, sempre in stato pending.
drop policy if exists "L'utente invia la propria richiesta PT" on public.pt_requests;
create policy "L'utente invia la propria richiesta PT"
  on public.pt_requests for insert
  with check (auth.uid() = user_id and status = 'pending');

-- L'utente vede solo le proprie richieste (per lo stato).
drop policy if exists "L'utente legge le proprie richieste PT" on public.pt_requests;
create policy "L'utente legge le proprie richieste PT"
  on public.pt_requests for select
  using (auth.uid() = user_id);

-- L'admin vede tutte le richieste.
drop policy if exists "L'admin legge tutte le richieste PT" on public.pt_requests;
create policy "L'admin legge tutte le richieste PT"
  on public.pt_requests for select
  using ((auth.jwt() ->> 'email') = 'candotto.d@gmail.com');

-- Solo l'admin può aggiornare (approvare/rifiutare).
drop policy if exists "L'admin decide le richieste PT" on public.pt_requests;
create policy "L'admin decide le richieste PT"
  on public.pt_requests for update
  using ((auth.jwt() ->> 'email') = 'candotto.d@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'candotto.d@gmail.com');

-- 3) POLICY profiles — l'admin può promuovere/retrocedere i ruoli.
drop policy if exists "L'admin aggiorna i ruoli" on public.profiles;
create policy "L'admin aggiorna i ruoli"
  on public.profiles for update
  using ((auth.jwt() ->> 'email') = 'candotto.d@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'candotto.d@gmail.com');
