-- Decoration & Arch Rental — seed data: the starter catalog for a NEW project.
--
-- ⛔ FOR A FRESH, EMPTY DATABASE ONLY. NEVER RUN THIS ON THE LIVE DATABASE.
-- Run it once, right after schema.sql, on a brand-new Supabase project. The
-- live catalog is edited in /admin, and changes to the live database ship as
-- migration-*.sql files, never through this file.
--
-- It refuses to run when `categories` or `products` already has rows: it stops
-- with an error and changes nothing. (Until Oct 2026 it emptied those tables
-- first instead, which on the live database would have deleted every category,
-- product, colour and product photo, and every line of every request.)
--
-- ⚠️ PRICES BELOW ARE PLACEHOLDERS (EUR). Real prices are set in admin.

begin;

-- The guard. It runs inside the transaction above, so its error rolls back
-- everything after it too.
do $$
begin
  if exists (select 1 from categories) or exists (select 1 from products) then
    raise exception 'seed.sql is for a fresh, empty database only: categories or products already has rows. Nothing was changed.';
  end if;
end $$;

-- ---------- Categories ----------
insert into categories (slug, name, sort) values
  ('arches',           'Арки',              1),
  ('covers',           'Калъфи за арки',    2),
  ('balloons',         'Балони',            3),
  ('balloon-figures',  'Фигури с балони',   4),
  ('character-figures','Фигурки герои',     5),
  ('signs',            'Надписи и табели',  6),
  ('props',            'Аксесоари',         7);

-- ---------- Products ----------
-- columns: slug, category, name, base_price, pricing_type, quantity, track_availability, rentable, service_only, sort
insert into products (slug, category_id, name, base_price, pricing_type, quantity, track_availability, rentable, service_only, sort) values
  -- Арки
  ('arch-oval-180x80',  (select id from categories where slug='arches'), 'Овална арка 180×80 см', 60, 'fixed', 2, true, true, false, 1),
  ('arch-oval-165x50',  (select id from categories where slug='arches'), 'Овална арка 165×50 см', 55, 'fixed', 2, true, true, false, 2),
  ('arch-round-180',    (select id from categories where slug='arches'), 'Кръгла арка 180 см',    65, 'fixed', 3, true, true, false, 3),
  -- Калъфи
  ('arch-cover',        (select id from categories where slug='covers'), 'Калъф за арка',         30, 'fixed', 6, true, true, false, 1),
  -- Балони (consumable)
  ('balloons',          (select id from categories where slug='balloons'), 'Балони (различни цветове)', 40, 'fixed', 1, false, false, false, 1),
  -- Фигури с балони
  ('figure-number-1',   (select id from categories where slug='balloon-figures'), 'Цифра „1" с кухина за балони', 50, 'fixed', 1, true, true, false, 1),
  -- Фигурки герои
  ('figure-winnie',     (select id from categories where slug='character-figures'), 'Мечо Пух и приятели', 40, 'fixed', 1, true, true, false, 1),
  ('figure-baby-boss-1',(select id from categories where slug='character-figures'), 'Baby Boss (единица)',  40, 'fixed', 1, true, true, false, 2),
  ('figure-elsa',       (select id from categories where slug='character-figures'), 'Елза',                 40, 'fixed', 1, true, true, false, 3),
  ('figure-anna',       (select id from categories where slug='character-figures'), 'Анна',                 40, 'fixed', 1, true, true, false, 4),
  ('figure-olaf-sven',  (select id from categories where slug='character-figures'), 'Олаф и Свен',          40, 'fixed', 1, true, true, false, 5),
  -- Надписи (price on request)
  ('sign-happy-birthday',(select id from categories where slug='signs'), 'Надпис „Happy Birthday" / рожден ден', null, 'custom_quote', 1, true, true, false, 1),
  ('sign-christening',   (select id from categories where slug='signs'), 'Надпис за кръщене',                    null, 'custom_quote', 1, true, true, false, 2),
  ('sign-bride-to-be',   (select id from categories where slug='signs'), 'Надпис „Bride to be"',                 null, 'custom_quote', 1, true, true, false, 3),
  ('table-signs-pink',   (select id from categories where slug='signs'), 'Табелки за маса (розови)',             15, 'fixed', 1, true, true, false, 4),
  -- Аксесоари
  ('photo-mirror',      (select id from categories where slug='props'), 'Огледало за снимки', 50, 'fixed', 1, true, true, false, 1),
  ('sign-stand',        (select id from categories where slug='props'), 'Стойка за табели',   20, 'fixed', 1, true, true, false, 2),
  ('easel',             (select id from categories where slug='props'), 'Статив',             25, 'fixed', 2, true, true, false, 3);

-- ---------- Colors / swatches ----------
-- Arch covers (the canonical swatch example)
insert into product_colors (product_id, color_slug, color_name, hex, quantity, sort) values
  ((select id from products where slug='arch-cover'), 'white',       'Бял',                '#FFFFFF',  1, 1),
  ((select id from products where slug='arch-cover'), 'red',         'Червен',             '#D33333',  1, 2),
  ((select id from products where slug='arch-cover'), 'yellow',      'Жълт',               '#F2C200',  1, 3),
  ((select id from products where slug='arch-cover'), 'blue',        'Син',                '#2E6FD6',  1, 4),
  ((select id from products where slug='arch-cover'), 'pink',        'Розов',              '#E68AB8',  1, 5),
  ((select id from products where slug='arch-cover'), 'elsa-castle', 'Замък на Елза',       null,      1, 6),  -- pattern → show image tile
  ((select id from products where slug='arch-cover'), 'blue-check',  'Син на квадратчета',  null,      1, 7);  -- pattern → show image tile

-- Balloons (a few colors to start)
insert into product_colors (product_id, color_slug, color_name, hex, quantity, sort) values
  ((select id from products where slug='balloons'), 'white', 'Бял',    '#FFFFFF',  1, 1),
  ((select id from products where slug='balloons'), 'red',   'Червен', '#D33333',  1, 2),
  ((select id from products where slug='balloons'), 'blue',  'Син',    '#2E6FD6',  1, 3),
  ((select id from products where slug='balloons'), 'pink',  'Розов',  '#E68AB8',  1, 4),
  ((select id from products where slug='balloons'), 'gold',  'Златен', '#D4A24E',  1, 5),
  ((select id from products where slug='balloons'), 'pastel','Пастел', '#F2D9E6',  1, 6);

-- Easel variants
insert into product_colors (product_id, color_slug, color_name, hex, quantity, sort) values
  ((select id from products where slug='easel'), 'wood',  'Дървен',  '#B08A5B',  1, 1),
  ((select id from products where slug='easel'), 'metal', 'Метален', '#9AA0A6',  1, 2);

-- The three products above show their colours as swatches, each colour with
-- its own count (product_colors.quantity).
update products set has_colors = true where slug in ('arch-cover', 'balloons', 'easel');

-- product_images: left empty — upload photos to the `catalog` bucket and insert rows
-- following the naming in catalog-and-images.md, e.g. products/arch-cover/red--01.webp

-- ---------- Configurator wiring ----------
-- Same configuration as migration-configurator.sql, for a from-scratch seed.
-- Hyphens, not em dashes, in customer-facing copy.

update categories set
  in_configurator = true, picker = 'dropdown', add_label = 'Добави арка',
  description = 'Основата на украсата - рамка, която обличаме в цвят.',
  recommend_category_id = (select id from categories where slug = 'covers'),
  recommend_title = 'За тази арка препоръчваме да изберете калъф',
  recommend_hint  = 'Калъфът се поставя върху рамката и задава цвета на украсата.',
  recommend_label = 'Калъф'
where slug = 'arches';

-- covers = arch add-on only; balloon-figures ends up empty (its product moves below).
update categories set in_configurator = false where slug in ('covers', 'balloon-figures');

update categories set in_configurator = true, picker = 'text', add_label = 'Добави балони',
  description = 'Цветовете, които задават настроението на празника.' where slug = 'balloons';

update categories set in_configurator = true, picker = 'grid', add_label = 'Добави фигурка',
  description = 'Героят на празника - избира се направо от снимка.' where slug = 'character-figures';

update categories set in_configurator = true, picker = 'dropdown', add_label = 'Добави надпис',
  description = 'Име, повод или цифра - за снимките и за масата.' where slug = 'signs';

update categories set in_configurator = true, picker = 'dropdown', add_label = 'Добави огледало / стойка',
  description = 'За кът за снимки и за поставяне на табели.' where slug = 'props';

-- Product groupings (the modal's first dropdown).
update products set option_group = 'Овална арка' where slug in ('arch-oval-180x80', 'arch-oval-165x50');
update products set option_group = 'Кръгла арка' where slug = 'arch-round-180';

update products set category_id = (select id from categories where slug = 'signs'),
  option_group = 'Цифра с балони' where slug = 'figure-number-1';
update products set option_group = 'Пластмасов надпис'
  where slug in ('sign-happy-birthday', 'sign-christening', 'sign-bride-to-be');
update products set option_group = 'Табелки за маса' where slug = 'table-signs-pink';

update products set option_group = 'Огледало за снимки' where slug = 'photo-mirror';
update products set option_group = 'Статив' where slug = 'easel';
-- sign-stand has no option_group, so it stays hidden in the modal until it gets one.

-- How each product is offered (balloons are only set up by her), and one cover per arch.
update products set offer_mode = 'setup' where rentable = false;
update products set covers_needed = 1
  where category_id = (select id from categories where slug = 'arches');

commit;
