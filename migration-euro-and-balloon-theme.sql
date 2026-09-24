-- Migration: prices in euro
-- Run once in the Supabase SQL editor, AFTER migration-configurator.sql.
--
-- Euro: the site now shows every price in € instead of лв. The numbers are NOT
-- converted — 60 stays 60, now read as 60,00 € — and she re-prices in admin.
-- So the only database change is labelling the money columns, which the
-- Supabase table editor shows next to each column.
--
-- Idempotent on purpose: COMMENT ON just overwrites, so re-running it changes
-- nothing.

begin;

-- ---------- Euro ----------

comment on column products.base_price      is 'EUR';
comment on column bookings.estimated_total  is 'EUR';
comment on column booking_items.line_price  is 'EUR';

commit;
