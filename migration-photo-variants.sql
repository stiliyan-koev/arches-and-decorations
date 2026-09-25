-- Photo variants: keep the whole photo next to the cropped 4:5 tile.
-- Run once in the Supabase SQL editor. Additive, safe to re-run. No RLS change:
-- the row-level policies already cover every column.
alter table product_images add column if not exists full_path text;  -- whole photo, shrunk. null = old row, use path
alter table product_images add column if not exists crop jsonb;       -- last crop {x,y,width,height} in full-photo pixels. null = not cropped
