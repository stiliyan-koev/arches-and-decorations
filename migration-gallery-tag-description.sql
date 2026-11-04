-- A short text per gallery tag: shown under the heading on /gallery?tag=…
-- and used as that page's description in Google's results. Edited in
-- /admin/gallery next to the tag's name; '' = the generic gallery text.
-- Run once in the Supabase SQL editor, BEFORE this code goes live: the
-- gallery and /admin/gallery read the column. Additive, safe to re-run
-- (a text she has already changed in the admin is left alone).
alter table gallery_tags add column if not exists description text not null default '';

-- The owner's texts for the tags that exist today, matched by slug.
update gallery_tags t
set description = v.description
from (values
  ('rozhden-den',
   'Украси за рожден ден за малки и големи: балонни арки, фотостени и надписи с име и възраст, в цветовете и темата, които изберете.'),
  ('krashtene',
   'Украси за кръщене, от семпли и нежни до пищни и празнични. Цветовете и детайлите, като името на детето, избирате вие.'),
  ('abiturientski-bal',
   'Украси за абитуриентски бал и изпращане: арки, фотозони и надписи с годината на випуска, в цветовете, които изберете.'),
  ('zlatni-baloni',
   'Украси, в които златото е водещо: самостоятелно или в съчетание с бяло, бежово, черно или пастелни тонове. Подходящи за всеки повод.'),
  ('sini-baloni',
   'Украси в сини нюанси, от светли до наситени, самостоятелно или с други цветове. Подходящи за всеки повод.'),
  ('rozhden-den-elza-frozen',
   'Тематична украса по приказката „Замръзналото кралство“, с любимите герои и снежни детайли, в цветовете на приказката.'),
  ('bride-to-be',
   'Украси за моминско парти: надпис „Bride to be“, балони и кът за снимки с приятелките, в цветовете, които изберете.')
) as v(slug, description)
where t.slug = v.slug and t.description = '';

-- Check: which tags have a text.
-- select name, slug, description from gallery_tags order by name;
