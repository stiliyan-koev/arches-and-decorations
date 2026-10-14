-- Storage policies for the `catalog` bucket.
-- Run this once in the Supabase SQL editor, after creating the bucket.
--
-- schema.sql covers the tables; storage.objects is a separate table with its
-- own RLS, which is why this lives in its own file. Without it the admin
-- upload fails with "new row violates row-level security policy" even though
-- the user is logged in.
--
-- The write policies ask is_admin() (created by migration-admin-policies.sql,
-- which carries the same three policies, so either file closes this hole).
-- "authenticated" is NOT treated as "admin": public sign-up is on by default,
-- and without the identity check any account of this project could overwrite
-- or delete every image on the site. If you run this file on a database where
-- migration-admin-policies.sql has not run yet, is_admin() does not exist and
-- these three statements fail — run that migration first.

-- Anyone may read: the bucket is public and the site links straight to it.
-- The dashboard's "Public bucket" toggle usually creates this one already.
drop policy if exists "catalog public read" on storage.objects;
create policy "catalog public read"
  on storage.objects for select
  using (bucket_id = 'catalog');

-- Only an admin (a user listed in `admins`) may add, replace or remove files.
-- `(select is_admin())` as a scalar subquery: evaluated once per statement
-- instead of once per row.
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
