-- Migration: slot-based configurator
-- Run once in the Supabase SQL editor, AFTER schema.sql + seed.sql are already live.
-- Adds the columns the homepage configurator reads to decide how each category
-- behaves, then records the configuration.
--
-- Idempotent on purpose: every ADD COLUMN is guarded and every UPDATE keys off a
-- slug, so running it against the current live DB — which already has these
-- columns and this exact configuration — changes nothing. Note that the UPDATE
-- block below is the source of truth for these specific fields, so re-running it
-- would revert any later admin edits to them (category copy, option groups).
--
-- Columns:
--   categories.in_configurator      -- show this category as a family on the homepage
--   categories.description          -- the hint line under the family title
--   categories.add_label            -- text on the green "add" button
--   categories.picker               -- 'dropdown' | 'grid' (how the products are chosen)
--   categories.recommend_category_id-- add-on category offered inside the modal (null = none)
--   categories.recommend_title/hint/label -- copy for that add-on block
--   products.option_group           -- first-dropdown grouping (null = skip the first step)

begin;

-- ---------- Columns ----------

alter table categories add column if not exists in_configurator       boolean not null default true;
alter table categories add column if not exists description           text;
alter table categories add column if not exists add_label             text;
alter table categories add column if not exists picker                text    not null default 'dropdown';
alter table categories add column if not exists recommend_category_id uuid references categories(id) on delete set null;
alter table categories add column if not exists recommend_title       text;
alter table categories add column if not exists recommend_hint        text;
alter table categories add column if not exists recommend_label       text;

alter table products   add column if not exists option_group          text;

alter table categories drop constraint if exists categories_picker_check;
alter table categories add  constraint categories_picker_check check (picker in ('dropdown', 'grid'));

-- ---------- Configuration (matches the live catalog) ----------
-- Hyphens, not em dashes, in customer-facing copy.

-- Families and their copy.
update categories set
  in_configurator = true, picker = 'dropdown', add_label = 'Добави арка',
  description = 'Основата на украсата - рамка, която обличаме в цвят.',
  recommend_category_id = (select id from categories where slug = 'covers'),
  recommend_title = 'За тази арка препоръчваме да изберете калъф',
  recommend_hint  = 'Калъфът се поставя върху рамката и задава цвета на украсата.',
  recommend_label = 'Калъф'
where slug = 'arches';

-- Not families of their own: covers is only the arch add-on; the balloon number
-- figure has moved under „Надписи и табели" (below), leaving this category empty.
update categories set in_configurator = false where slug in ('covers', 'balloon-figures');

update categories set in_configurator = true, picker = 'dropdown', add_label = 'Добави балони',
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
-- NOTE: sign-stand ('Стойка за табели') has no option_group, so in a category that
-- otherwise uses them it never appears in the modal. Give it one to surface it.

commit;
