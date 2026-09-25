-- Migration: prices in euro + balloon theme text box
-- Run once in the Supabase SQL editor, AFTER migration-configurator.sql.
--
-- Euro: the site now shows every price in € instead of лв. The numbers are NOT
-- converted — 60 stays 60, now read as 60,00 € — and she re-prices in admin.
-- So the only database change is labelling the money columns, which the
-- Supabase table editor shows next to each column.
--
-- Balloon theme: a third picker, 'text'. Instead of choosing a product, the
-- customer describes the theme in a text box; the category's first product is
-- the item, and the text lands in booking_items.custom_text (already in the
-- schema). Balloons switch to it — she suggests balloons from the description.
--
-- Idempotent on purpose: COMMENT ON just overwrites, the constraint is dropped
-- before it's re-added, and the UPDATE keys off a slug. picker isn't editable in
-- admin, so the UPDATE can't overwrite anything she changed.

begin;

-- ---------- Euro ----------

comment on column products.base_price      is 'EUR';
comment on column bookings.estimated_total  is 'EUR';
comment on column booking_items.line_price  is 'EUR';

-- ---------- Balloon theme ----------

alter table categories drop constraint if exists categories_picker_check;
alter table categories add  constraint categories_picker_check check (picker in ('dropdown', 'grid', 'text'));

update categories set picker = 'text' where slug = 'balloons';

-- custom_text is now filled from a public form, and the "public create
-- booking_items" policy checks nothing, so cap it in the database too. 1000
-- matches MAX_CUSTOM_TEXT in src/app/actions.ts.
alter table booking_items drop constraint if exists booking_items_custom_text_len;
alter table booking_items add  constraint booking_items_custom_text_len
  check (custom_text is null or length(custom_text) <= 1000);

commit;
