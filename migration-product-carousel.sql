-- Product carousel: extra photos of a product's variations, shown as a swipeable
-- carousel instead of the single photo. Run once in the Supabase SQL editor.
-- Additive, safe to re-run. No RLS change: the row-level policies already cover
-- every column.
alter table products add column if not exists carousel boolean not null default false;                -- master switch
alter table products add column if not exists carousel_in_configurator boolean not null default true; -- show it in the configurator popup
alter table products add column if not exists carousel_in_catalog boolean not null default true;      -- show it on the catalog card
alter table product_images add column if not exists in_carousel boolean not null default false;       -- a carousel photo, not a main/colour photo
