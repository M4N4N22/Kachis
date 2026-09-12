-- Kachis wallet-first org model (run in Supabase SQL editor)
-- Identity = Midnight wallet address. Email/social auth comes later.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  active_tier text not null
    check (active_tier in ('sandbox', 'institutional')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Institutional default: all five packs (bits 0–4) = 31
  required_pack_mask integer not null default 31,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  wallet_address text not null,
  created_at timestamptz not null default now(),
  unique (profile_id, organization_id),
  unique (wallet_address, organization_id)
);

create index if not exists profiles_wallet_address_idx
  on public.profiles (wallet_address);

create index if not exists memberships_wallet_address_idx
  on public.memberships (wallet_address);

create index if not exists memberships_organization_id_idx
  on public.memberships (organization_id);

-- Public shield console log (commitments + settlement metadata). No original paste.
create table if not exists public.attestations (
  id text primary key,
  ledger_id integer not null,
  cleaned_hash text not null,
  binding text not null,
  pack_flags integer not null default 0,
  findings jsonb not null default '[]'::jsonb,
  circuit text not null,
  attested_at timestamptz not null,
  status text not null,
  source text not null check (source in ('console', 'agent', 'extension', 'chain')),
  wallet_address text,
  note text not null default '',
  tx_id text,
  tx_hash text,
  contract_address text,
  network text,
  on_chain boolean,
  created_at timestamptz not null default now(),
  unique (cleaned_hash, binding)
);

create index if not exists attestations_ledger_id_idx
  on public.attestations (ledger_id desc);

create index if not exists attestations_cleaned_hash_idx
  on public.attestations (cleaned_hash);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.attestations enable row level security;

-- Server routes use the service role key (bypasses RLS).
-- No anon policies yet — wallet session auth lands before public client reads.
