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
  -- How it's offered (admin keeps rentable/service_only in step with it):
  -- 'rent' = rent only, 'both' = rent or with setup, 'setup' = setup only.
  offer_mode         text not null default 'both' check (offer_mode in ('rent','both','setup')),
  covers_needed      int  not null default 0 check (covers_needed >= 0), -- arch covers per piece
  active             boolean not null default true,
  sort               int  not null default 0,
  -- Carousel of variation photos (product_images.in_carousel), instead of the
  -- single photo. The master switch hides it everywhere; the other two pick where.
  carousel                 boolean not null default false,
  carousel_in_configurator boolean not null default true,
  carousel_in_catalog      boolean not null default true,
  -- Colour variations: the colours below show as swatches on the catalog card,
  -- each with its own stock. Off = the colours stay but are hidden everywhere.
  has_colors               boolean not null default false,
  -- „Прозорец за изисквания“: „Добави“ first asks the customer to describe what
  -- they want (e.g. a custom label); the text goes to booking_items.custom_text.
  asks_requirements        boolean not null default false,
  created_at         timestamptz default now()
);

-- Colors / variants -> render as swatches on the catalog card
create table product_colors (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  color_slug text not null,            -- 'white','red','elsa-castle',...
  color_name text not null,            -- BG display
  hex        text,                     -- swatch fill; null for pattern swatches
  quantity   int  not null default 1 check (quantity >= 0), -- how many of this colour she owns
  sort       int  not null default 0,
  unique (product_id, color_slug)
);

-- The photo library, managed from /admin/photos: every original photo, once.
-- The carousel, the gallery and the products each use a library photo through
-- their own row, with their own framing (tile + crop).
create table photos (
  id           uuid primary key default gen_random_uuid(),
  path         text not null unique,                -- the original, shrunk: photos/{uuid}.webp
  has_original boolean not null default true,       -- false = only a cropped copy survived (old rows)
  created_at   timestamptz not null default now()
);

create index photos_created_at on photos (created_at desc);

-- Images for the carousel. color_id null = color-agnostic / base image.
create table product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  color_id   uuid references product_colors(id) on delete set null, -- deleting a colour keeps its photos
  photo_id   uuid references photos(id) on delete cascade, -- the library photo this tile is cut from
  path       text not null,            -- storage path of the 4:5 tile, see catalog-and-images.md
  full_path  text,                     -- copy of the library photo's path (until migration-photo-library-cleanup.sql)
  crop       jsonb,                    -- last crop {x,y,width,height} in full-photo pixels. null = not cropped
  in_carousel boolean not null default false, -- a carousel photo (colour-agnostic), not a main/colour photo
  sort       int  not null default 0
);

create index product_images_photo on product_images (photo_id);

-- ---------- Homepage ----------

-- The homepage photo carousel, managed from /admin/home.
create table hero_photos (
  id      uuid primary key default gen_random_uuid(),
  photo_id uuid unique references photos(id) on delete cascade, -- the library photo; once at most
  path    text not null,             -- storage path of the 4:5 tile, home/hero/… (or the original: "Без изрязване")
  crop    jsonb,                     -- last crop {x,y,width,height} in original pixels
  caption text not null default '',  -- the white pill on the photo; '' = no pill
  sort    int  not null default 0
);

-- Showcases ("Украси"), managed from /admin/showcases: finished decorations,
-- each a title, a short text and several library photos shown whole. The
-- first three by sort that have a photo are the cards on the homepage.
create table showcases (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null default '',   -- plain text; a blank line starts a new paragraph
  sort       int  not null default 0,    -- the first three by sort show on the homepage
  created_at timestamptz not null default now()
);

create table showcase_photos (
  id          uuid primary key default gen_random_uuid(),
  showcase_id uuid not null references showcases(id) on delete cascade,
  photo_id    uuid not null references photos(id)    on delete cascade,
  sort        int  not null default 0,   -- the first photo is the card's cover
  unique (showcase_id, photo_id)
);

create index showcase_photos_showcase on showcase_photos (showcase_id, sort);

-- ---------- Gallery ----------

-- Past work, managed from /admin/gallery. A photo can have several tags; the
-- tags with photos become the filter chips on /gallery. Newest first.
create table gallery_photos (
  id         uuid primary key default gen_random_uuid(),
  photo_id   uuid unique references photos(id) on delete cascade, -- the library photo; once at most
  path       text not null,                      -- 4:5 tile, gallery/{uuid}.webp
  full_path  text,                               -- copy of the library photo's path (until the cleanup migration)
  crop       jsonb,                              -- last crop {x,y,width,height} in original pixels
  created_at timestamptz not null default now()
);

create table gallery_tags (
  id   uuid primary key default gen_random_uuid(),
  name text not null,         -- the filter chip, e.g. "Рожден ден"
  slug text not null unique   -- the URL, /gallery?tag=rozhden-den
);

create table gallery_photo_tags (
  photo_id uuid not null references gallery_photos(id) on delete cascade,
  tag_id   uuid not null references gallery_tags(id)   on delete cascade,
  primary key (photo_id, tag_id)
);

create index gallery_photos_created_at on gallery_photos (created_at desc);
create index gallery_photo_tags_tag    on gallery_photo_tags (tag_id, photo_id);

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

-- ---------- Settings ----------

-- Site-wide values she edits in admin. Exactly one row (id = 1); a new setting
-- is a new column.
create table settings (
  id           int primary key default 1 check (id = 1),
  labour_price numeric(10,2) not null default 50 check (labour_price >= 0) -- „Труд за украса“, EUR; 0 = none
);

insert into settings (id) values (1);

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

-- Same sum per colour, for products with colours: each colour has its own
-- stock (product_colors.quantity). The request page calls it next to
-- reserved_qty_all.
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

grant execute on function reserved_qty(uuid, date, date) to anon, authenticated;
grant execute on function reserved_qty_all(date, date)   to anon, authenticated;
grant execute on function reserved_qty_by_color(date, date) to anon, authenticated;

-- available = products.quantity - reserved_qty(...). track_availability=false items are always available.
-- A product with colours: available per colour = product_colors.quantity - reserved_qty_by_color(...).

-- ---------- Forgetting old requests (GDPR) ----------
-- 12 months after the event a request forgets who sent it: name, phone, note
-- and the requirements text go; products, dates, city and prices stay. /privacy
-- promises exactly this — change both together. Nightly through pg_cron.
-- Details in migration-retention.sql.
create or replace function forget_old_requests() returns void
language sql set search_path = public as $$
  update booking_items bi
     set custom_text = null
    from bookings b
   where b.id = bi.booking_id
     and bi.custom_text is not null
     and coalesce(b.end_date, b.start_date, b.event_date, b.created_at::date)
         < (current_date - interval '12 months')::date;

  update bookings
     set customer_name = null, phone = null, note = null
   where (customer_name is not null or phone is not null or note is not null)
     and coalesce(end_date, start_date, event_date, created_at::date)
         < (current_date - interval '12 months')::date;
$$;

revoke execute on function forget_old_requests() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('forget-old-requests', '15 3 * * *', 'select forget_old_requests()');

-- ---------- Who the admin is ----------
-- One row per admin user. The "admin all …" policies below key off this table,
-- not off "is this request logged in at all": any Supabase account of the
-- project is logged in, and sign-ups are open by default.
--
-- !!! After running this file, IN THE SAME SQL EDITOR SESSION:
-- !!!   1. Open Authentication → Users in the dashboard and look at who is
-- !!!      actually there. Public sign-up is on by default, so the list can
-- !!!      hold strangers and leftover test accounts. Do NOT promote the
-- !!!      whole list.
-- !!!   2. Insert the two owner uids by hand, copied from that page:
-- !!!
-- !!!        insert into admins (user_id) values
-- !!!          ('paste-the-first-uid-here'),
-- !!!          ('paste-the-second-uid-here');
-- !!!
-- !!!   3. Switch public sign-up OFF in the same sitting: Authentication →
-- !!!      Sign In / Providers → "Allow new users to sign up".
-- !!!
-- !!! The table starts empty, and an empty table means nobody can write
-- !!! anything in /admin. `bookings` / `booking_items` have no public read
-- !!! policy either, so /admin/requests then shows an EMPTY list rather than
-- !!! an error.
create table if not exists admins (
  user_id uuid primary key references auth.users on delete cascade
);

-- Is the caller one of the owner's accounts? `security definer` for the same
-- reason as reserved_qty above: the policies have to read a table the caller
-- itself may not read. It only ever returns true or false. Granted to anon
-- too, because a public SELECT evaluates every policy on the table.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

grant execute on function is_admin() to anon, authenticated;

-- ---------- Row Level Security (starter policies — review before prod) ----------
-- Public can READ the catalog; the contact form can INSERT a booking request;
-- everything else requires an authenticated admin.

alter table categories     enable row level security;
alter table products       enable row level security;
alter table product_colors enable row level security;
alter table photos         enable row level security;
alter table product_images enable row level security;
alter table bookings       enable row level security;
alter table booking_items  enable row level security;
alter table blackout_dates enable row level security;
alter table hero_photos    enable row level security;
alter table showcases       enable row level security;
alter table showcase_photos enable row level security;
alter table gallery_photos     enable row level security;
alter table gallery_tags       enable row level security;
alter table gallery_photo_tags enable row level security;
alter table settings           enable row level security;
alter table admins             enable row level security;
-- No policy on `admins` on purpose: nothing reads it through the API.

-- Public read of the catalog
create policy "public read categories"     on categories     for select using (true);
create policy "public read products"        on products        for select using (active);
create policy "public read product_colors" on product_colors for select using (true);
create policy "public read photos"         on photos         for select using (true);
create policy "public read product_images" on product_images for select using (true);
create policy "public read hero_photos"    on hero_photos    for select using (true);
create policy "public read showcases"       on showcases       for select using (true);
create policy "public read showcase_photos" on showcase_photos for select using (true);
create policy "public read gallery_photos"     on gallery_photos     for select using (true);
create policy "public read gallery_tags"       on gallery_tags       for select using (true);
create policy "public read gallery_photo_tags" on gallery_photo_tags for select using (true);
create policy "public read settings"           on settings           for select using (true);

-- Public may submit a request (insert only), but never read bookings
create policy "public create booking"       on bookings       for insert with check (status = 'requested');
create policy "public create booking_items" on booking_items  for insert with check (true);

-- Admin (a user listed in `admins`): full access
create policy "admin all categories"     on categories     for all using ((select is_admin())) with check ((select is_admin()));
create policy "admin all products"        on products        for all using ((select is_admin())) with check ((select is_admin()));
create policy "admin all product_colors" on product_colors for all using ((select is_admin())) with check ((select is_admin()));
create policy "admin all photos"         on photos         for all using ((select is_admin())) with check ((select is_admin()));
create policy "admin all product_images" on product_images for all using ((select is_admin())) with check ((select is_admin()));
create policy "admin all bookings"        on bookings        for all using ((select is_admin())) with check ((select is_admin()));
create policy "admin all booking_items"  on booking_items  for all using ((select is_admin())) with check ((select is_admin()));
create policy "admin all blackout"        on blackout_dates for all using ((select is_admin())) with check ((select is_admin()));
create policy "admin all hero_photos"    on hero_photos    for all using ((select is_admin())) with check ((select is_admin()));
create policy "admin all showcases"       on showcases       for all using ((select is_admin())) with check ((select is_admin()));
create policy "admin all showcase_photos" on showcase_photos for all using ((select is_admin())) with check ((select is_admin()));
create policy "admin all gallery_photos"     on gallery_photos     for all using ((select is_admin())) with check ((select is_admin()));
create policy "admin all gallery_tags"       on gallery_tags       for all using ((select is_admin())) with check ((select is_admin()));
create policy "admin all gallery_photo_tags" on gallery_photo_tags for all using ((select is_admin())) with check ((select is_admin()));
create policy "admin all settings"           on settings           for all using ((select is_admin())) with check ((select is_admin()));
