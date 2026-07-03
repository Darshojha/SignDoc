-- Run this in Supabase SQL Editor as a standalone migration step.
-- envelope_status already includes DECLINED in the current repo migration,
-- but this is safe if the live database is missing it.
alter type envelope_status add value if not exists 'DECLINED';
