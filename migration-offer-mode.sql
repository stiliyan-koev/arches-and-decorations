-- How a product is offered, and how many arch covers it needs. Run once in the
-- Supabase SQL editor. Additive, safe to re-run. Run it BEFORE this code goes
-- live: the catalog reads products.offer_mode and products.covers_needed, and
-- without them it falls back to the hardcoded catalog. No RLS change: the
-- row-level policies already cover every column.
--
-- offer_mode replaces the two checkboxes (rentable / service_only) with one
-- choice in admin:
--   'rent'  — „Може под наем“: the customer collects it, no setup
--   'both'  — „С монтаж от нас“: rented, or set up by us
--   'setup' — „Само с монтаж от нас“: never rented on its own
-- rentable and service_only stay, and admin keeps them in step with it.
--
-- covers_needed: how many arch covers one piece of the product needs (a set of
-- two arches: 2). The basket warns when it holds fewer covers than that.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'offer_mode'
  ) then
    alter table products add column offer_mode text not null default 'both';
    alter table products add constraint products_offer_mode_check
      check (offer_mode in ('rent', 'both', 'setup'));
    -- Whatever couldn't be rented until now is setup-only; the rest keeps
    -- both ways, as the site treated it so far.
    update products set offer_mode = 'setup' where rentable = false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'covers_needed'
  ) then
    alter table products add column covers_needed int not null default 0;
    alter table products add constraint products_covers_needed_check
      check (covers_needed >= 0);
    -- One cover per arch: every product in a category that recommends another
    -- category (arches -> covers). A set of two arches is changed to 2 by hand.
    update products set covers_needed = 1
    where category_id in (
      select id from categories where recommend_category_id is not null
    );
  end if;
end $$;
