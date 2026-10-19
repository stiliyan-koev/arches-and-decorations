-- „Труд за украса“: the labour price the catalog's basket adds once to a
-- decoration she sets up („Украса с монтаж“). Run once in the Supabase SQL
-- editor, AFTER migration-admin-policies.sql (the write policy calls
-- is_admin()). Additive, safe to re-run.
--
-- Until it has run, the site uses 50 € (LABOUR_PRICE_DEFAULT in
-- src/lib/settings.ts) and saving the price in admin fails.
--
-- `settings` holds site-wide values she edits in admin. Exactly one row
-- (id = 1); a new setting is a new column.

create table if not exists settings (
  id           int primary key default 1 check (id = 1),
  labour_price numeric(10,2) not null default 50 check (labour_price >= 0) -- EUR; 0 = no labour line
);

insert into settings (id) values (1) on conflict (id) do nothing;

alter table settings enable row level security;

drop policy if exists "public read settings" on settings;
create policy "public read settings" on settings for select using (true);

drop policy if exists "admin all settings" on settings;
create policy "admin all settings" on settings for all using ((select is_admin())) with check ((select is_admin()));
