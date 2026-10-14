-- Showcases ("Украси"): finished decorations, each a title, a short text and
-- several library photos. The first three by sort are the cards on the
-- homepage; managed from /admin/showcases. Run once in the Supabase SQL
-- editor. Additive, safe to re-run. Run it BEFORE this code goes live:
-- /admin/photos and the photo picker read showcase_photos.
-- Needs migration-photo-library.sql first: showcase_photos references photos.
-- No files of their own: a showcase shows its library photos whole
-- (photos.path), and the card crops the first one with CSS.
create table if not exists showcases (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null default '',   -- plain text; a blank line starts a new paragraph
  sort       int  not null default 0,    -- the first three by sort show on the homepage
  created_at timestamptz not null default now()
);

create table if not exists showcase_photos (
  id          uuid primary key default gen_random_uuid(),
  showcase_id uuid not null references showcases(id) on delete cascade,
  photo_id    uuid not null references photos(id)    on delete cascade,
  sort        int  not null default 0,   -- the first photo is the card's cover
  unique (showcase_id, photo_id)
);

create index if not exists showcase_photos_showcase on showcase_photos (showcase_id, sort);

alter table showcases       enable row level security;
alter table showcase_photos enable row level security;

drop policy if exists "public read showcases" on showcases;
create policy "public read showcases" on showcases for select using (true);

-- Admin write policies live in migration-admin-policies.sql, keyed off the `admins` table.

drop policy if exists "public read showcase_photos" on showcase_photos;
create policy "public read showcase_photos" on showcase_photos for select using (true);

