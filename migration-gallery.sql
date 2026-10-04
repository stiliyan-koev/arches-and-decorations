-- Gallery of past work: the photos, the tags she files them under, and which
-- photo has which tag. Managed from /admin/gallery, shown on /gallery.
-- Run once in the Supabase SQL editor. Additive, safe to re-run.
-- Files go in the existing `catalog` bucket under gallery/, which
-- storage-policies.sql already covers.
create table if not exists gallery_photos (
  id         uuid primary key default gen_random_uuid(),
  path       text not null,                      -- 4:5 tile, gallery/{uuid}.webp
  full_path  text not null,                      -- whole photo, gallery/full/{uuid}.webp
  created_at timestamptz not null default now()  -- the gallery shows newest first
);

create table if not exists gallery_tags (
  id   uuid primary key default gen_random_uuid(),
  name text not null,         -- the filter chip, e.g. "Рожден ден"
  slug text not null unique   -- the URL, /gallery?tag=rozhden-den
);

create table if not exists gallery_photo_tags (
  photo_id uuid not null references gallery_photos(id) on delete cascade,
  tag_id   uuid not null references gallery_tags(id)   on delete cascade,
  primary key (photo_id, tag_id)
);

create index if not exists gallery_photos_created_at on gallery_photos (created_at desc);
create index if not exists gallery_photo_tags_tag    on gallery_photo_tags (tag_id, photo_id);

alter table gallery_photos     enable row level security;
alter table gallery_tags       enable row level security;
alter table gallery_photo_tags enable row level security;

drop policy if exists "public read gallery_photos" on gallery_photos;
create policy "public read gallery_photos" on gallery_photos for select using (true);
drop policy if exists "public read gallery_tags" on gallery_tags;
create policy "public read gallery_tags" on gallery_tags for select using (true);
drop policy if exists "public read gallery_photo_tags" on gallery_photo_tags;
create policy "public read gallery_photo_tags" on gallery_photo_tags for select using (true);

drop policy if exists "admin all gallery_photos" on gallery_photos;
create policy "admin all gallery_photos" on gallery_photos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "admin all gallery_tags" on gallery_tags;
create policy "admin all gallery_tags" on gallery_tags for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "admin all gallery_photo_tags" on gallery_photo_tags;
create policy "admin all gallery_photo_tags" on gallery_photo_tags for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
