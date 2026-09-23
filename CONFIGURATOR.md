# Configurator — spec (reverse-engineered from the live build)

This is the canonical pattern. Everything below was read off the running app at `127.0.0.1:5173`. Build and keep the configurator 1:1 with this.

## Shell

One rounded card split into two columns:

- **Left — builder** (~68%): white surface.
- **Right — summary rail** (~32%): pale blush tint, joined to the same card, sticky while the grid scrolls.

Above it: eyebrow `ДА ГО НАПРАВИМ ВАШЕ`, the step heading, and a step pill on the right of the header row.

A preview banner runs full-width above the fold: *„Предварителен преглед · Цените са примерни. Онлайн запитванията още не са активни."*

## Two-step flow

| Step | Heading | Pill | Primary CTA |
|---|---|---|---|
| 1 | Създайте своята украса | `Стъпка 1 от 2` | `Място и дата →` |
| 2 | Кога и къде празнуваме? | `Стъпка 2 от 2` | `Изпрати запитване` |

Step 2 has a back link `← Към детайлите`. The summary rail and the mode toggle persist across both steps; selections survive the step change.

## Mode toggle (segmented control)

`✓ Украса с монтаж` | `Само под наем` — sits directly under the heading, persists across steps. Active segment gets a white pill + checkmark.

## Category tabs

Pill row, horizontally scrollable (visible scrollbar when it overflows):

`Арки · Калъфи · Балони · Надписи и цифри · Фигурки · Огледала и стойки · За масата`

Active pill = filled blush. Switching tabs swaps the grid only — selections in other categories are kept and stay in the summary.

## Product grid

3 columns on desktop. Card, top to bottom:

1. **Image area** (~4:3), placeholder `Снимка предстои`. For colour variants the placeholder is tinted to that colour and captioned with the colour name.
2. **Name** — links to `/products/{slug}` (the PDP).
3. **Spec line** — `180 × 80 см`, `Ø 180 см`, `Пластмасов надпис`, `По индивидуална оферта`.
4. **Bottom row** — price on the left, qty stepper on the right.

**Selected state:** rose border + faint rose background fill. Unselected cards keep a neutral border.

**Colour variants are flattened into separate cards** — `Кальф за арка · Бял`, `· Розов`, `· Син` are three cards with three steppers, not one card with swatches. (Swatches stay on the PDP.)

**Custom-quote items** show `По запитване` where the price goes, and still carry a stepper. They don't contribute to the total.

## Qty stepper

`−  {n}  +`, starts at 0. Accessible names are `Добави {product}` / `Премахни {product}`. Bumping above 0 selects the card; back to 0 deselects and drops it from the summary.

## Summary rail

- Eyebrow `ВАШИЯТ ПРАЗНИК` + serif headline *„Малко по малко, става вълшебно."*
- **Empty:** sub-copy *„Изберете първите детайли за вашата украса."*, muted/disabled CTA.
- **With items:** line list, one row per product — `Овална арка × 2` … `50,00 €` — then `Примерна сума` and the total at display size (`155,00 €`).
- Note under the total: *„Монтажът и транспортът се изчисляват след попълване на място и дата."*
- CTA goes dark/filled once anything is selected.
- Fine print: *„Запитването не е резервация. Потвърждаваме лично всеки празник."*

## Step 2 fields

- `Град / населено място` (prefilled „Варна")
- `Дата и час на събитието` — datetime-local
- `Вземане на артикулите` / `Връщане на артикулите` — datetime-local pair
- `Промокод` (по желание)
- Note: *„Всички часове са по българско време. За многодневен наем уточняваме крайната цена лично."*
- `Желана фигурка, надпис, цветове или допълнителни детайли` — textarea
- **Как да се свържем с вас?** — `Вашето име`, `Телефон`, `Имейл` (по желание)
- `Website` — honeypot, hidden from real users, kept for spam filtering
- GDPR consent checkbox + privacy note

## Open gaps (fix these — they're real, not cosmetic)

1. **The stepper ignores stock.** I set Овална арка to **5** and it accepted it — she owns 2. Cap `+` at `products.quantity`, and once a date is known, at what's actually free that day. The entire architecture exists to prevent double-booking; an uncapped stepper walks straight past it.
2. **The mode toggle does nothing.** `Само под наем` and `Украса с монтаж` produce identical totals and both show the „монтаж и транспорт" note. Either it filters to `rentable` items and drops the setup fee, or it should come out.
3. **The „2 hours before the event" question is gone.** It was a stated requirement for producing a final price — it isn't in step 2.
4. **Pickup/return show in both modes.** With монтаж, pickup and return are her logistics, not the customer's — hide that pair in service mode.
5. **Currency switched to €** (earlier seed data was in лв). Fine, just make it consistent across seed, admin and PDP.
