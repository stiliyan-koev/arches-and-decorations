-- One-off data fix for the offer_mode back-fill. Run once in the Supabase SQL
-- editor; safe to re-run, because it only touches rows that are still wrong.
--
-- migration-offer-mode.sql filled offer_mode from `rentable` alone:
--   update products set offer_mode = 'setup' where rentable = false;
-- That ignored the old `service_only` checkbox, so a product ticked
-- „Само с монтаж от нас“ while „Може под наем“ was left on came out as
-- offer_mode = 'both' — and from 1.3.0 on 'both' is offered under „Под наем“,
-- which is exactly what she said she does not rent out.
--
-- The back-fill ran inside `if not exists (offer_mode)`, so re-running that
-- migration will NOT redo it. This file corrects the rows it already wrote.
-- (migration-offer-mode.sql itself now uses the right rule, for a fresh install.)
--
-- Look before running — these are the rows about to change:
--   select id, name, rentable, service_only, offer_mode
--     from products
--    where service_only = true and offer_mode <> 'setup';
--
-- Admin keeps rentable/service_only in step with offer_mode, so a row that
-- still has service_only = true means setup-only and nothing else.

update products
   set offer_mode = 'setup'
 where service_only = true
   and offer_mode <> 'setup';
