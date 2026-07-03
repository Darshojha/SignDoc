-- Backfill the existing envelope/template rows to a real owner and tighten the
-- ownership columns so future writes cannot omit them.

do $$
declare
  owner_id uuid;
begin
  select id
    into owner_id
  from auth.users
  where email = 'darsh.ojha@xtransmatrix.com'
  limit 1;

  if owner_id is not null then
    update templates
      set created_by = owner_id
    where created_by is null;

    update envelopes
      set created_by = owner_id
    where created_by is null;
  end if;
end $$;

create index if not exists templates_created_by_idx on templates (created_by);
create index if not exists envelopes_created_by_idx on envelopes (created_by);

do $$
begin
  if not exists (select 1 from templates where created_by is null) then
    alter table templates alter column created_by set not null;
  end if;

  if not exists (select 1 from envelopes where created_by is null) then
    alter table envelopes alter column created_by set not null;
  end if;
end $$;
