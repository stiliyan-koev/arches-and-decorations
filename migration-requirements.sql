-- „Прозорец за изисквания“ on a product. Run once in the Supabase SQL editor.
-- Additive, safe to re-run. Run it BEFORE this code goes live: the catalog
-- reads products.asks_requirements, and without it falls back to the hardcoded
-- catalog. No RLS change: the row-level policies already cover every column.
--
-- When it's on, „Добави“ in the catalog first opens a box „Опишете вашите
-- изисквания“ (e.g. the text for a custom label). What the customer writes
-- travels with the basket line and is saved to booking_items.custom_text — the
-- column the balloon theme already uses, so bookings need no change.

alter table products add column if not exists asks_requirements boolean not null default false;
