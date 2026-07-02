-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
-- Creates the `templates` table: a document + its field layout, saved without
-- specific signers attached (see templates-and-bulk-send skill).

create extension if not exists "pgcrypto";

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  created_by uuid,
  name text not null,
  storage_path text not null,
  page_count integer not null default 1,
  field_layout jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists templates_created_at_idx on templates (created_at desc);

-- RLS is on from day one (see PROJECT.md data-protection guardrail). No policies
-- are defined yet because there is no auth/org system in place: every read/write
-- goes through server API routes using the service-role key, which bypasses RLS.
-- Once auth-and-permissions is built, add org-scoped policies here for
-- browser/anon-key access.
alter table templates enable row level security;
