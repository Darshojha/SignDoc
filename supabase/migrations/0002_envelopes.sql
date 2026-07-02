-- Run this after 0001_templates.sql in the Supabase SQL Editor.
-- Creates the envelope workflow tables used by document-workflow-engine and
-- auth-and-permissions. RLS is enabled; server routes use the service-role key.

create extension if not exists "pgcrypto";

do $$ begin
  create type envelope_status as enum (
    'DRAFT',
    'SENT',
    'VIEWED',
    'PARTIALLY_SIGNED',
    'COMPLETED',
    'DECLINED',
    'VOIDED',
    'EXPIRED'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type signing_order as enum ('sequential', 'parallel');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type signer_status as enum ('pending', 'viewed', 'signed', 'declined');
exception
  when duplicate_object then null;
end $$;

create table if not exists envelopes (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references templates(id) on delete set null,
  title text not null,
  status envelope_status not null default 'DRAFT',
  signing_order signing_order not null default 'sequential',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days')
);

create table if not exists envelope_documents (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references envelopes(id) on delete cascade,
  template_id uuid references templates(id) on delete set null,
  storage_path text not null,
  signed_storage_path text,
  page_count integer not null default 1,
  field_layout jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists envelope_signers (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references envelopes(id) on delete cascade,
  name text not null,
  user_email text not null,
  assigned_role text not null,
  order_index integer not null default 1,
  status signer_status not null default 'pending',
  access_token_hash text,
  access_token_expires_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  signature_text text,
  created_at timestamptz not null default now(),
  unique (envelope_id, assigned_role),
  unique (access_token_hash)
);

create table if not exists envelope_events (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references envelopes(id) on delete cascade,
  actor text not null,
  event_type text not null,
  timestamp timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists envelopes_created_at_idx on envelopes (created_at desc);
create index if not exists envelope_signers_envelope_idx on envelope_signers (envelope_id, order_index);
create index if not exists envelope_signers_token_idx on envelope_signers (access_token_hash);
create index if not exists envelope_events_envelope_idx on envelope_events (envelope_id, timestamp);

alter table envelopes enable row level security;
alter table envelope_documents enable row level security;
alter table envelope_signers enable row level security;
alter table envelope_events enable row level security;
