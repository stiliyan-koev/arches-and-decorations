# Catalog PLP — build brief

Drop this folder into the repo (suggested: `docs/design/plp/`) and point Claude Code at it:

> Read `docs/design/plp/PLP-BRIEF.md` and implement the catalog page it describes.

Everything needed is in this folder. No external links required.

```
plp-handoff/
├── PLP-BRIEF.md                   ← this file: spec + acceptance criteria
└── reference/
    ├── plp-desktop.html           ← WORKING reference. Open it in a browser.
    │                                Filters, counts, sorting and URL state all run.
    │                                Port the logic, not the DOM code.
    ├── plp-mobile.html            ← static mobile list + filter bottom sheet
    ├── tokens.css                 ← brand tokens (same as claude/design.md)
    └── products.seed.json         ← 12 seed products in the shape the PLP consumes
```

---

## What this is

The catalog listing page for the decoration-rental site: every product, with
filtering and sorting. Public, informational — no cart, no checkout, no payment.
Adding an item puts it in the same "оферта" selection the configurator uses.

**Stack:** match whatever the repo already does. Do not introduce a new router,
state library, CSS framework or data layer. (Note: `architecture-decision.md`
says Next.js App Router, while `configurator.md` was reverse-engineered from a
Vite dev server. Follow the code, not the docs, and flag the mismatch.)

**Copy is Bulgarian.** Fonts need the cyrillic subset: Unbounded (headings),
Nunito (body).

---

## Routes

| Route | Behaviour |
|---|---|
| `/catalog` | all products |
| `/catalog/[category]` | same page, that category preselected |

Category slugs come from `catalog-and-images.md`: `arches`, `covers`,
`balloons`, `balloon-figures`, `character-figures`, `signs`, `props`.

Server-render the list for SEO ("балон декорации Варна" is the whole point of
choosing Next.js). Filtering and sorting then run client-side — the catalog is
under ~200 items, so a server round trip per checkbox is wasted latency.

---

## Data

From Supabase: `products` joined to `categories`, `product_colors`, and the
first `product_images` row per product.

Fields the PLP uses: `slug`, `name`, spec line, `base_price`, `pricing_type`,
`rentable`, `quantity`, `track_availability`, category, colors[].

No image files exist yet — render the placeholder tile ("Снимка предстои")
tinted per category, exactly as in the reference.

`products.seed.json` has the shape, with example prices. **Real prices come
from the admin — never hardcode these.**

---

## Filters

| Facet | Control | Source |
|---|---|---|
| Категория | checkbox list with counts | `products.category_id` |
| Цвят и десен | swatch buttons | `product_colors` (only covers + balloons have any today) |
| Цена | 4 bands: до 20 / 20–40 / 40–60 / над 60 € | `products.base_price` |
| Наличност | date input + "Скрий заетите" | computed, see below |
| Режим | segmented "Украса с монтаж" / "Само под наем" | `products.rentable` |

### Two rules that are easy to get wrong

**1. Facet counts exclude their own facet.**
The count next to each category is computed against every *other* active
filter, but not against the category selection itself. Ticking "Арки" must not
show `0` next to "Калъфи". See `narrow(list, skip)` in `plp-desktop.html`.

**2. "Само под наем" is not cosmetic.**
It filters out `rentable = false` (balloons are consumables — sold, not rented)
and must later drop the setup fee from the total. The configurator currently
has the same toggle doing nothing (gap #2 in `configurator.md`). Don't copy
that bug; fixing the configurator is a separate task.

---

## Sorting

`Препоръчани` (manual rank) · `Цена ↑` · `Цена ↓` · `Най-нови` · `Име А–Я`

- Name sort: `localeCompare(a, b, 'bg')` — Cyrillic collation is not the default.
- `pricing_type = 'custom_quote'` items have no price, so they sort **last in
  both price directions**. An item without a price is not "the cheapest".

---

## URL state

Every facet and the sort live in the query string:

```
/catalog?cat=arches,covers&price=20-40&color=pink&free=1&sort=price-asc
```

- Reading the URL on mount restores the exact view.
- Changing a filter uses `replaceState` — no history entry per click, so Back
  leaves the catalog instead of stepping through 9 filter changes.
- `/catalog/arches` and `/catalog?cat=arches` must render the same list.

---

## Card states

Five, all in `plp-desktop.html` and visible at once in the mockup:

1. **Standard** — price + "Добави"
2. **Hover** — rose border, soft shadow, underlined name, filled button
3. **Added** — rose border, filled "✓ Добавено", counts toward the header pill
4. **Заето на тази дата** — dimmed, badge on the image, disabled button.
   Shown, **not hidden** — she may still be able to do it, that's a conversation.
5. **По запитване** — no price, "Запитване" button, contributes 0 to any total

The whole image is a link to `/products/[slug]`.

"Добави" writes to the **same selection store the configurator uses** — one
shared source, not a second list. If that store doesn't exist yet, create it
somewhere both pages can import from.

---

## Mobile

- Filters live in a bottom sheet (`plp-mobile.html`), not a sidebar
- Sort is a native `<select>` — don't build a custom dropdown
- Grid is 2 columns, "Покажи още" instead of pagination
- Sticky category pill row under the header

---

## Availability — read before wiring the date filter

Real availability, per `architecture-decision.md`:

```
free(product, date) = product.quantity
                    − Σ qty in confirmed bookings whose date range covers `date`
```

Postgres `daterange` + the overlap operator does this in one query.

**If that query isn't in place yet, hide the date input and the "Скрий заетите"
checkbox entirely and leave a TODO.** A date filter that silently returns
everything is worse than no date filter — it tells a customer an item is free
on their daughter's birthday when it isn't.

---

## Out of scope

PDP, cart, checkout, payments, admin, the configurator itself. No new dependencies.

---

## Done when

- [ ] `/catalog` and `/catalog/arches` render server-side from real DB data
- [ ] All five facets and all five sorts work
- [ ] Facet counts follow rule 1
- [ ] "Само под наем" actually removes non-rentable items
- [ ] `custom_quote` items sort last in both price directions
- [ ] Full view survives a page reload via the URL
- [ ] Empty state renders with a working "Изчисти филтрите"
- [ ] Layout matches the reference at 1360px and 390px
- [ ] Keyboard: every control reachable by Tab, visible focus ring, swatch
      buttons have `aria-label`, touch targets ≥44px on mobile
- [ ] No hardcoded prices

Keep the code plain. Small named functions, no clever abstractions, no generic
"filter engine". Someone should be able to read it six months from now and see
what it does.
