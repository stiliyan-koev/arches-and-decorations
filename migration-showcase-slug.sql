-- Each showcase gets its own page, /ukrasi/<slug>, besides the popup on the
-- homepage. The slug is made from the title once and then kept, so editing a
-- title later doesn't break links Google or customers already have.
-- Run once in the Supabase SQL editor, BEFORE this code goes live: the
-- homepage and /admin/showcases read the column. Additive, safe to re-run.
alter table showcases add column if not exists slug text;

-- Fill it for the showcases that exist already, the same way src/lib/slug.ts
-- does it in the app: Cyrillic to Latin, then anything else becomes "-".
-- Multi-letter sounds first, single letters after. Capitals are mapped too,
-- because lower() leaves Cyrillic alone under some database locales.
update showcases
set slug = trim(both '-' from regexp_replace(
  translate(
    replace(replace(replace(replace(replace(replace(replace(replace(
    replace(replace(replace(replace(replace(replace(replace(replace(
      lower(title),
      'щ', 'sht'), 'Щ', 'sht'), 'ж', 'zh'), 'Ж', 'zh'),
      'ц', 'ts'), 'Ц', 'ts'), 'ч', 'ch'), 'Ч', 'ch'),
      'ш', 'sh'), 'Ш', 'sh'), 'ю', 'yu'), 'Ю', 'yu'),
      'я', 'ya'), 'Я', 'ya'), 'ь', 'y'), 'Ь', 'y'),
    'абвгдезийклмнопрстуфхъАБВГДЕЗИЙКЛМНОПРСТУФХЪ',
    'abvgdeziyklmnoprstufhaabvgdeziyklmnoprstufha'),
  '[^a-z0-9]+', '-', 'g'))
where slug is null;

-- Two showcases with the same title: the later one gets a bit of its id.
update showcases s
set slug = s.slug || '-' || left(s.id::text, 4)
from (
  select id, row_number() over (partition by slug order by created_at, id) as n
  from showcases
) dup
where dup.id = s.id and dup.n > 1;

create unique index if not exists showcases_slug on showcases (slug);

-- Check: every showcase has a slug, none repeats.
-- select title, slug from showcases order by sort;
