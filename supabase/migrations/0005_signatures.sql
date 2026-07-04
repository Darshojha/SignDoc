-- Create storage bucket and signature records for captured signatures.

create extension if not exists "pgcrypto";

do $$ begin
  create type signature_capture_type as enum ('typed', 'drawn', 'uploaded');
exception
  when duplicate_object then null;
end $$;

create table if not exists signatures (
  id uuid primary key default gen_random_uuid(),
  signer_id uuid not null references envelope_signers(id) on delete cascade,
  envelope_id uuid not null references envelopes(id) on delete cascade,
  type signature_capture_type not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists signatures_envelope_idx on signatures (envelope_id, created_at desc);
create index if not exists signatures_signer_idx on signatures (signer_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('signatures', 'signatures', false)
on conflict (id) do nothing;
