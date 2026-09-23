-- Storage policies for the `catalog` bucket.
-- Run this once in the Supabase SQL editor, after creating the bucket.
--
-- schema.sql covers the tables; storage.objects is a separate table with its
-- own RLS, which is why this lives in its own file. Without it the admin
-- upload fails with "new row violates row-level security policy" even though
-- the user is logged in.

-- Anyone may read: the bucket is public and the site links straight to it.
-- The dashboard's "Public bucket" toggle usually creates this one already.
drop policy if exists "catalog public read" on storage.objects;
create policy "catalog public read"
  on storage.objects for select
  using (bucket_id = 'catalog');

-- Only a logged-in admin may add, replace or remove files.
drop policy if exists "catalog admin insert" on storage.objects;
create policy "catalog admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'catalog');

drop policy if exists "catalog admin update" on storage.objects;
create policy "catalog admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'catalog')
  with check (bucket_id = 'catalog');

drop policy if exists "catalog admin delete" on storage.objects;
create policy "catalog admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'catalog');
