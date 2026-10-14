-- Product colours: a switch per product ("Има варианти по цвят") and a count
-- per colour. The colours become swatches on the catalog card, and every
-- colour has its own stock. Run once in the Supabase SQL editor. Additive,
-- safe to re-run. Run it BEFORE this code goes live: the catalog reads
-- products.has_colors and product_colors.quantity, and without them it falls
-- back to the hardcoded catalog. No RLS change: the row-level policies already
-- cover every column, and the new function is granted below.

-- The two columns in one block, so each one is added only when it is missing.
-- Neither gets a backfill: `has_colors` stays at its `false` default, so this
-- file switches nothing to colour mode on its own.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'has_colors'
  ) then
    -- `false` for every product, old ones included. A product shows swatches
    -- only once „Има варианти по цвят“ is ticked for it in admin, and that
    -- comes AFTER its per-colour counts are right (see the note below).
    alter table products add column has_colors boolean not null default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_colors' and column_name = 'quantity'
  ) then
    -- `default 1` writes one of each colour into every existing row already,
    -- so no update statement is needed here. One, the same as seed.sql uses,
    -- and NOT the product's own count: the catalog now makes a product's
    -- quantity the SUM of its colours, so copying 6 into 7 colours would
    -- report 42 in stock and the site would happily take 42 bookings.
    -- Order of work in admin, per product: set the real count per colour
    -- FIRST, then tick „Има варианти по цвят“ — understating stock is safe,
    -- overstating double-books.
    alter table product_colors add column quantity int not null default 1;
    alter table product_colors add constraint product_colors_quantity_check check (quantity >= 0);
  end if;
end $$;

-- Deleting a colour keeps its photos: they move to "Всички цветове"
-- (color_id null) instead of being deleted with it. Re-created by name, so
-- running this again changes nothing.
alter table product_images drop constraint if exists product_images_color_id_fkey;
alter table product_images
  add constraint product_images_color_id_fkey
  foreign key (color_id) references product_colors(id) on delete set null;

-- Like reserved_qty_all in schema.sql, but per colour: how many of each colour
-- confirmed bookings hold between two dates. Same `security definer` reasoning
-- and the same guards against bad booking rows; it only ever returns counts.
create or replace function reserved_qty_by_color(p_from date, p_to date)
returns table (color_id uuid, reserved int)
language sql stable security definer set search_path = public as $$
  select bi.color_id, sum(bi.qty)::int
  from booking_items bi
  join bookings b on b.id = bi.booking_id
  where bi.color_id is not null
    and b.status = 'confirmed'
    and coalesce(b.start_date, b.event_date) is not null
    and coalesce(b.end_date, b.start_date, b.event_date) >= coalesce(b.start_date, b.event_date)
    and daterange(
          coalesce(b.start_date, b.event_date),
          coalesce(b.end_date, b.start_date, b.event_date),
          '[]'
        ) && daterange(p_from, p_to, '[]')
  group by bi.color_id;
$$;

grant execute on function reserved_qty_by_color(date, date) to anon, authenticated;
