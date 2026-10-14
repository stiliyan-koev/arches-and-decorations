-- Homepage photo carousel: the photos and their captions, managed from
-- /admin/home. Run once in the Supabase SQL editor. Additive, safe to re-run.
-- Files go in the existing `catalog` bucket under home/hero/, which
-- storage-policies.sql already covers.
create table if not exists hero_photos (
  id      uuid primary key default gen_random_uuid(),
  path    text not null,             -- storage path of the 4:5 photo, home/hero/…
  caption text not null default '',  -- the white pill on the photo; '' = no pill
  sort    int  not null default 0
);

alter table hero_photos enable row level security;

drop policy if exists "public read hero_photos" on hero_photos;
create policy "public read hero_photos" on hero_photos for select using (true);

-- Admin write policies live in migration-admin-policies.sql, keyed off the `admins` table.
