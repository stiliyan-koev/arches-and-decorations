-- The „Под наем“ switch at the top of admin → Каталог: whether the site offers
-- renting at all. Run once in the Supabase SQL editor, AFTER
-- migration-labour.sql (it adds a column to `settings`). Additive, safe to
-- re-run.
--
-- Until it has run, the site shows „Под наем“ as it always has and saving the
-- switch in admin fails.

alter table settings
  add column if not exists rent_enabled boolean not null default true;
