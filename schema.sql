-- Decoration & Arch Rental — Supabase schema
-- Run in the Supabase SQL editor. Keep it simple; extend when a real need shows up.

create extension if not exists "pgcrypto";

-- ---------- Catalog ----------

create table categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,            -- BG display name
  sort       int  not null default 0,
  created_at timestamptz default now()
);

create table products (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  category_id        uuid references categories(id) on delete set null,
  name               text not null,               -- BG
  description        text,                         -- BG
  base_price         numeric(10,2),                -- null = price on request
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
  estimated_total numeric(10,2),
  created_at      timestamptz default now()
);

create table booking_items (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  color_id    uuid references product_colors(id) on delete set null,
  custom_text text,                    -- e.g. the figure the customer described
  qty         int not null default 1,
  line_price  numeric(10,2)
);

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

create or replace function reserved_qty(p_product uuid, p_from date, p_to date)
returns int language sql stable as $$
  select coalesce(sum(bi.qty), 0)
  from booking_items bi
  join bookings b on b.id = bi.booking_id
  where bi.product_id = p_product
    and b.status = 'confirmed'
    and daterange(
          coalesce(b.start_date, b.event_date),
          coalesce(b.end_date,   b.event_date),
          '[]'
        ) && daterange(p_from, p_to, '[]');
$$;

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
