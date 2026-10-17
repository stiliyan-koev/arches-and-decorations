-- Admin identity: only YOUR accounts may write, not "any logged-in account".
--
-- RUN IT AFTER THE OTHER MIGRATIONS (gallery, hero photos, photo library,
-- showcases). It re-creates policies on the tables those files add, and a
-- missing table aborts the script — the SQL editor then rolls the whole run
-- back, so nothing changes at all while the file looks like it ran.
--
-- ======================================================================
-- READ THIS BEFORE YOU RUN IT. The `admins` table starts EMPTY, and from
-- the moment this file runs the "admin all …" policies let only the users
-- listed in it touch those tables. So, IN THE SAME SQL EDITOR SESSION,
-- RIGHT AFTER THIS MIGRATION:
--
--   1. Open Authentication → Users in the dashboard and look at who is
--      actually there. Public sign-up is on by default and this is a live
--      project, so the list can hold strangers and leftover test accounts.
--      Do NOT promote the whole list.
--   2. Insert the two owner uids by hand, copied from that page:
--
--        insert into admins (user_id) values
--          ('paste-the-first-uid-here'),
--          ('paste-the-second-uid-here');
--
--   3. Switch public sign-up OFF in the same sitting: Authentication →
--      Sign In / Providers → "Allow new users to sign up".
--
-- Skip step 2 and the admin locks itself out of its own tables. Every save
-- in /admin fails with "new row violates row-level security policy" — and
-- because `bookings` / `booking_items` have no public read policy, only
-- this admin one, /admin/requests then shows an EMPTY inbox even when
-- requests exist, with no error to explain why.
-- ======================================================================
--
-- Why: every "admin all …" policy used to be `auth.role() = 'authenticated'`,
-- which means ANY Supabase account of this project — and new sign-ups are
-- allowed by default. One registration would have been full read/write on the
-- catalog plus every customer's name and phone in `bookings`, and (through the
-- storage policies below) the right to overwrite or delete every image on the
-- site. Keeping sign-ups off helps, but the identity check belongs here: a
-- direct API call with the anon key never passes through the site's code.
--
-- The app depends on this file: requireAdmin() in src/app/admin/actions.ts
-- calls the is_admin() rpc created below, so on a database where this
-- migration has not run the function is missing, the call errors and every
-- admin action is denied. Run it before, or together with, the deploy.
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
-- caller itself may not read. `stable` like its siblings there — the answer
-- cannot change inside one statement. It only ever returns true or false.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- Granted to anon as well: a public SELECT on the catalog evaluates every
-- policy on the table, this one included, and a missing EXECUTE right would
-- make the public pages fail instead of simply returning false.
grant execute on function is_admin() to anon, authenticated;

-- Every "admin all …" policy, re-created against is_admin(). Dropped by name
-- first, so running this file again changes nothing. `(select is_admin())` and
-- not a bare call: as a scalar subquery Postgres evaluates it once per
-- statement instead of once per row.
drop policy if exists "admin all categories" on categories;
create policy "admin all categories" on categories for all using ((select is_admin())) with check ((select is_admin()));

drop policy if exists "admin all products" on products;
create policy "admin all products" on products for all using ((select is_admin())) with check ((select is_admin()));

drop policy if exists "admin all product_colors" on product_colors;
create policy "admin all product_colors" on product_colors for all using ((select is_admin())) with check ((select is_admin()));

drop policy if exists "admin all photos" on photos;
create policy "admin all photos" on photos for all using ((select is_admin())) with check ((select is_admin()));

drop policy if exists "admin all product_images" on product_images;
create policy "admin all product_images" on product_images for all using ((select is_admin())) with check ((select is_admin()));

drop policy if exists "admin all bookings" on bookings;
create policy "admin all bookings" on bookings for all using ((select is_admin())) with check ((select is_admin()));

drop policy if exists "admin all booking_items" on booking_items;
create policy "admin all booking_items" on booking_items for all using ((select is_admin())) with check ((select is_admin()));

drop policy if exists "admin all blackout" on blackout_dates;
create policy "admin all blackout" on blackout_dates for all using ((select is_admin())) with check ((select is_admin()));

drop policy if exists "admin all hero_photos" on hero_photos;
create policy "admin all hero_photos" on hero_photos for all using ((select is_admin())) with check ((select is_admin()));

drop policy if exists "admin all showcases" on showcases;
create policy "admin all showcases" on showcases for all using ((select is_admin())) with check ((select is_admin()));

drop policy if exists "admin all showcase_photos" on showcase_photos;
create policy "admin all showcase_photos" on showcase_photos for all using ((select is_admin())) with check ((select is_admin()));

drop policy if exists "admin all gallery_photos" on gallery_photos;
create policy "admin all gallery_photos" on gallery_photos for all using ((select is_admin())) with check ((select is_admin()));

drop policy if exists "admin all gallery_tags" on gallery_tags;
create policy "admin all gallery_tags" on gallery_tags for all using ((select is_admin())) with check ((select is_admin()));

drop policy if exists "admin all gallery_photo_tags" on gallery_photo_tags;
create policy "admin all gallery_photo_tags" on gallery_photo_tags for all using ((select is_admin())) with check ((select is_admin()));

-- The three write policies on the `catalog` bucket, same story: they used to
-- say `to authenticated` with nothing but the bucket name, so any account of
-- the project could overwrite or delete every image on the site. Re-created
-- here by their exact names from storage-policies.sql (which now carries the
-- same text), so one run of this file closes both halves — tables and files.
-- "catalog public read" is left alone: the bucket is public on purpose.
drop policy if exists "catalog admin insert" on storage.objects;
create policy "catalog admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'catalog' and (select is_admin()));

drop policy if exists "catalog admin update" on storage.objects;
create policy "catalog admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'catalog' and (select is_admin()))
  with check (bucket_id = 'catalog' and (select is_admin()));

drop policy if exists "catalog admin delete" on storage.objects;
create policy "catalog admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'catalog' and (select is_admin()));

-- The public read / public insert policies are untouched: the site must keep
-- working for visitors.
--
-- Don't forget steps 1–3 at the top: check Authentication → Users, insert your
-- two uids by hand, switch sign-up off.
