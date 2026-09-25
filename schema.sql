-- Decoration & Arch Rental — Supabase schema
-- Run in the Supabase SQL editor. Keep it simple; extend when a real need shows up.

create extension if not exists "pgcrypto";

-- ---------- Catalog ----------

create table categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,            -- BG display name
  sort       int  not null default 0,
  -- Configurator wiring (see migration-configurator.sql for the full rationale).
  in_configurator boolean not null default true,   -- show as a family on the homepage
  description     text,                             -- hint line under the family title
  add_label       text,                             -- label on the green "add" button
  picker          text not null default 'dropdown', -- 'dropdown' | 'grid' | 'text' (describe it in a text box)
  recommend_category_id uuid references categories(id) on delete set null, -- add-on category
  recommend_title text,
  recommend_hint  text,
  recommend_label text,
  created_at timestamptz default now(),
  constraint categories_picker_check check (picker in ('dropdown', 'grid', 'text'))
);

create table products (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  category_id        uuid references categories(id) on delete set null,
  name               text not null,               -- BG
  description        text,                         -- BG
  option_group       text,                         -- configurator first-dropdown grouping (null = skip)
  base_price         numeric(10,2),                -- EUR; null = price on request
  pricing_type       text not null default 'fixed',-- 'fixed' | 'custom_quote'
  quantity           int  not null default 1,      -- how many she physically owns
  track_availability boolean not null default true,-- false for consumables (balloons)
  rentable           boolean not null default true,-- can be loaned out standalone
  service_only       boolean not null default false,
  active             boolean not null default true,
  sort               int  not null default 0,
  created_at         timestamptz default now()
);

-- Colors / variants -> render as swatches on the PDP
create table product_colors (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  color_slug text not null,            -- 'white','red','elsa-castle',...
  color_name text not null,            -- BG display
  hex        text,                     -- swatch fill; null for pattern swatches
  sort       int  not null default 0,
  unique (product_id, color_slug)
);

-- Images for the carousel. color_id null = color-agnostic / base image.
create table product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  color_id   uuid references product_colors(id) on delete cascade,
  path       text not null,            -- storage path, see catalog-and-images.md
  sort       int  not null default 0
);

-- ---------- Bookings ----------

create table bookings (
  id              uuid primary key default gen_random_uuid(),
  type            text not null,                 -- 'service' | 'rental'
  status          text not null default 'requested', -- requested|confirmed|done|cancelled
  event_date      date,                          -- service: the day
  event_time      time,                          -- service only
  start_date      date,                          -- rental pickup
  end_date        date,                          -- rental return
  city            text,
  setup_2h_before boolean,
  customer_name   text,
  phone           text,
  note            text,
  estimated_total numeric(10,2),                 -- EUR
  created_at      timestamptz default now()
);

create table booking_items (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  color_id    uuid references product_colors(id) on delete set null,
  custom_text text,                    -- e.g. the figure the customer described
  qty         int not null default 1,
  line_price  numeric(10,2),           -- EUR
  -- custom_text comes from a public form and the public insert policy checks
  -- nothing, so cap it here too. 1000 matches MAX_CUSTOM_TEXT in src/app/actions.ts.
  constraint booking_items_custom_text_len
    check (custom_text is null or length(custom_text) <= 1000)
);

-- Every money column is in euro. The comments show up in the Supabase table
-- editor, so the currency is visible where she edits the data.
comment on column products.base_price      is 'EUR';
comment on column bookings.estimated_total  is 'EUR';
comment on column booking_items.line_price  is 'EUR';

-- Optional: owner days off / manual blocks
create table blackout_dates (
  id     uuid primary key default gen_random_uuid(),
  day    date not null,
  reason text
);

-- ---------- Availability helper ----------
-- A booking occupies [occupied_from, occupied_to]:
--   service -> [event_date, event_date]
--   rental  -> [start_date, end_date]
-- Reserved qty of a product on a date range = sum of qty in CONFIRMED bookings that overlap it.

-- `security definer` on purpose: the public configurator has to know what's
-- free on a date, but RLS gives anon no SELECT on bookings. These two functions
-- are the one crack in that wall, and they only ever return a count — never who
-- booked, or when.
-- Bad booking rows are skipped, never trusted:
--   * no dates at all -> would be an unbounded range that blocks the whole
--     catalog (the `is not null` line);
--   * end before start -> daterange() would throw and break the function for
--     every product (the `>=` line).
-- A booking with a start but no end counts as that single day.

create or replace function reserved_qty(p_product uuid, p_from date, p_to date)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(bi.qty), 0)
  from booking_items bi
  join bookings b on b.id = bi.booking_id
  where bi.product_id = p_product
    and b.status = 'confirmed'
    and coalesce(b.start_date, b.event_date) is not null
    and coalesce(b.end_date, b.start_date, b.event_date) >= coalesce(b.start_date, b.event_date)
    and daterange(
          coalesce(b.start_date, b.event_date),
          coalesce(b.end_date, b.start_date, b.event_date),
          '[]'
        ) && daterange(p_from, p_to, '[]');
$$;

-- Same sum, but for every product at once. The configurator calls this once
-- when the visitor picks a date instead of once per tile.
create or replace function reserved_qty_all(p_from date, p_to date)
returns table (product_id uuid, reserved int)
language sql stable security definer set search_path = public as $$
  select bi.product_id, sum(bi.qty)::int
  from booking_items bi
  join bookings b on b.id = bi.booking_id
  where bi.product_id is not null
    and b.status = 'confirmed'
    and coalesce(b.start_date, b.event_date) is not null
    and coalesce(b.end_date, b.start_date, b.event_date) >= coalesce(b.start_date, b.event_date)
    and daterange(
          coalesce(b.start_date, b.event_date),
          coalesce(b.end_date, b.start_date, b.event_date),
          '[]'
        ) && daterange(p_from, p_to, '[]')
  group by bi.product_id;
$$;

grant execute on function reserved_qty(uuid, date, date) to anon, authenticated;
grant execute on function reserved_qty_all(date, date)   to anon, authenticated;

-- available = products.quantity - reserved_qty(...). track_availability=false items are always available.

-- ---------- Row Level Security (starter policies — review before prod) ----------
-- Public can READ the catalog; the contact form can INSERT a booking request;
-- everything else requires an authenticated admin.

alter table categories     enable row level security;
alter table products       enable row level security;
alter table product_colors enable row level security;
alter table product_images enable row level security;
alter table bookings       enable row level security;
alter table booking_items  enable row level security;
alter table blackout_dates enable row level security;

-- Public read of the catalog
create policy "public read categories"     on categories     for select using (true);
create policy "public read products"        on products        for select using (active);
create policy "public read product_colors" on product_colors for select using (true);
create policy "public read product_images" on product_images for select using (true);

-- Public may submit a request (insert only), but never read bookings
create policy "public create booking"       on bookings       for insert with check (status = 'requested');
create policy "public create booking_items" on booking_items  for insert with check (true);

-- Authenticated admin: full access
create policy "admin all categories"     on categories     for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin all products"        on products        for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin all product_colors" on product_colors for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin all product_images" on product_images for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin all bookings"        on bookings        for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin all booking_items"  on booking_items  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin all blackout"        on blackout_dates for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
