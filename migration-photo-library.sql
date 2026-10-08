-- Photo library: one place that holds every original photo. The carousel, the
-- gallery and the products each *use* a library photo through their own row,
-- with their own framing (tile + crop). Managed from /admin/photos.
-- Run once in the Supabase SQL editor. Additive, safe to re-run: run it again
-- after the deploy too, so photos the old admin uploaded meanwhile get linked.
-- Needs migration-hero-photos.sql and migration-gallery.sql first: it alters
-- their tables.
-- Files stay where they are; new originals go in the `catalog` bucket under
-- photos/, which storage-policies.sql already covers.
create table if not exists photos (
  id           uuid primary key default gen_random_uuid(),
  path         text not null unique,                -- the original, shrunk: photos/{uuid}.webp (older ones keep their old folder)
  has_original boolean not null default true,       -- false = only a cropped copy survived (old rows)
  created_at   timestamptz not null default now()   -- the library shows newest first
);

create index if not exists photos_created_at on photos (created_at desc);

alter table photos enable row level security;

drop policy if exists "public read photos" on photos;
create policy "public read photos" on photos for select using (true);

drop policy if exists "admin all photos" on photos;
create policy "admin all photos" on photos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Each place points at its library photo. A photo is in the carousel and in
-- the gallery at most once; products can share one as often as they like.
-- Deleting a library photo takes it out of every place.
alter table product_images add column if not exists photo_id uuid references photos(id) on delete cascade;
alter table gallery_photos add column if not exists photo_id uuid unique references photos(id) on delete cascade;
alter table gallery_photos add column if not exists crop jsonb;   -- last crop {x,y,width,height} in original pixels
alter table gallery_photos alter column full_path drop not null;  -- the original now lives in photos.path
alter table hero_photos    add column if not exists photo_id uuid unique references photos(id) on delete cascade;
alter table hero_photos    add column if not exists crop jsonb;   -- null = not cropped / not known (old rows)

create index if not exists product_images_photo on product_images (photo_id);

-- Backfill: every photo the site already has becomes a library photo.
-- Products: the whole photo, or the tile for rows from before we kept it.
insert into photos (path, has_original)
  select coalesce(full_path, path), bool_or(full_path is not null)
  from product_images where photo_id is null
  group by coalesce(full_path, path)
  on conflict (path) do nothing;
update product_images r set photo_id = p.id
  from photos p
  where r.photo_id is null and p.path = coalesce(r.full_path, r.path);

-- Gallery: the whole photo, keeping the date it was added.
insert into photos (path, created_at)
  select full_path, min(created_at)
  from gallery_photos where photo_id is null and full_path is not null
  group by full_path
  on conflict (path) do nothing;
update gallery_photos r set photo_id = p.id
  from photos p
  where r.photo_id is null and p.path = r.full_path;

-- Carousel: only the cropped photo was ever kept.
insert into photos (path, has_original)
  select distinct path, false
  from hero_photos where photo_id is null
  on conflict (path) do nothing;
update hero_photos r set photo_id = p.id
  from photos p
  where r.photo_id is null and p.path = r.path;

-- Check afterwards, each should be 0:
--   select count(*) from product_images where photo_id is null;
--   select count(*) from gallery_photos where photo_id is null;
--   select count(*) from hero_photos    where photo_id is null;
