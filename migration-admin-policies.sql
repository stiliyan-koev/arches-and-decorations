-- Admin identity: only YOUR accounts may write, not "any logged-in account".
--
-- ======================================================================
-- READ THIS BEFORE YOU RUN IT. The `admins` table starts EMPTY, and from
-- the moment this file runs the "admin all …" policies let only the users
-- listed in it write. So, IN THE SAME SQL EDITOR SESSION, RIGHT AFTER
-- THIS MIGRATION, run:
--
--     insert into admins (user_id) select id from auth.users;
--
-- (or insert your two uids by hand, from Authentication → Users). Skip
-- this and the admin locks itself out of its own tables: every save in
-- /admin fails with "new row violates row-level security policy".
-- ======================================================================
--
-- Why: every "admin all …" policy used to be `auth.role() = 'authenticated'`,
-- which means ANY Supabase account of this project — and new sign-ups are
-- allowed by default. One registration would have been full read/write on the
-- catalog plus every customer's name and phone in `bookings`. Keeping sign-ups
-- off helps, but the identity check belongs here: a direct API call with the
-- anon key never passes through the site's code.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

-- Who the owner is. One row per admin user; no other columns — everything
-- else about the user lives in auth.users.
create table if not exists admins (
  user_id uuid primary key references auth.users on delete cascade
);

-- RLS on and no policy at all, on purpose: nothing reads this table through
-- the API. Only is_admin() below sees it, and that is `security definer`.
alter table admins enable row level security;

-- Is the caller one of the owner's accounts? `security definer` for the same
-- reason as reserved_qty in schema.sql: the policies have to read a table the
-- caller itself may not read. It only ever returns true or false.
create or replace function is_admin() returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- Granted to anon as well: a public SELECT on the catalog evaluates every
-- policy on the table, this one included, and a missing EXECUTE right would
-- make the public pages fail instead of simply returning false.
grant execute on function is_admin() to anon, authenticated;

-- Every "admin all …" policy, re-created against is_admin(). Dropped by name
-- first, so running this file again changes nothing.
drop policy if exists "admin all categories" on categories;
create policy "admin all categories" on categories for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all products" on products;
create policy "admin all products" on products for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all product_colors" on product_colors;
create policy "admin all product_colors" on product_colors for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all photos" on photos;
create policy "admin all photos" on photos for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all product_images" on product_images;
create policy "admin all product_images" on product_images for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all bookings" on bookings;
create policy "admin all bookings" on bookings for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all booking_items" on booking_items;
create policy "admin all booking_items" on booking_items for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all blackout" on blackout_dates;
create policy "admin all blackout" on blackout_dates for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all hero_photos" on hero_photos;
create policy "admin all hero_photos" on hero_photos for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all showcases" on showcases;
create policy "admin all showcases" on showcases for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all showcase_photos" on showcase_photos;
create policy "admin all showcase_photos" on showcase_photos for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all gallery_photos" on gallery_photos;
create policy "admin all gallery_photos" on gallery_photos for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all gallery_tags" on gallery_tags;
create policy "admin all gallery_tags" on gallery_tags for all using (is_admin()) with check (is_admin());

drop policy if exists "admin all gallery_photo_tags" on gallery_photo_tags;
create policy "admin all gallery_photo_tags" on gallery_photo_tags for all using (is_admin()) with check (is_admin());

-- The public read / public insert policies are untouched: the site must keep
-- working for visitors. Storage has its own policies in storage-policies.sql.
--
-- Don't forget: insert into admins (user_id) select id from auth.users;
