-- Per-field signature captures for the signer flow.
-- Token validation happens server-side (not auth.uid()); RLS denies direct table access.

create extension if not exists "pgcrypto";

do $$ begin
  create type signature_capture_type as enum ('typed', 'drawn', 'uploaded');
exception
  when duplicate_object then null;
end $$;

create table if not exists signatures (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references envelopes(id) on delete cascade,
  signer_id uuid not null references envelope_signers(id) on delete cascade,
  field_id text not null,
  image_data text not null,
  method signature_capture_type not null,
  signed_at timestamptz not null default now(),
  ip_address text,
  created_at timestamptz not null default now(),
  unique (signer_id, field_id)
);

create index if not exists signatures_envelope_idx on signatures (envelope_id, signed_at desc);
create index if not exists signatures_signer_idx on signatures (signer_id, signed_at desc);

alter table signatures enable row level security;

-- Signers authenticate via magic-link token in API routes (service role + token check).
-- No anon/authenticated policies — direct client inserts are denied by default.

create or replace function public.verify_signer_token(p_token text)
returns uuid
language sql
stable
security definer
set search_path = public, extensions
as $$
  select id
  from envelope_signers
  where access_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and access_token_expires_at > now()
    and status in ('pending', 'viewed')
  limit 1;
$$;

revoke all on function public.verify_signer_token(text) from public;
grant execute on function public.verify_signer_token(text) to service_role;
