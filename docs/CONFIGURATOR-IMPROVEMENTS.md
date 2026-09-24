# Configurator — target improvements

Companion to `CONFIGURATOR.md` (which describes what's built today). Keep the tile grid — it's the right pattern. These are the changes that make it correct and then make it good.

## The SFCC mapping (so the vocabulary is shared)

| This app | SFCC equivalent |
|---|---|
| Category pill row | Refinement bar |
| Product tile (image, name, info, price, qty) | Product tile + quick-add |
| Summary rail | Minicart |
| `products.quantity` | Inventory record / ATS |
| „По запитване" / „Последен брой" | Product badges |
| Step 2 | Checkout (contact + date instead of payment) |

---

## P0 — correctness. Do these first, nothing else matters until they're done.

**1. Cap the stepper at real stock.**
`+` disables at `product.quantity`. Tile shows `Налични: N` in the info line. This is currently broken — the stepper accepted 5 of an arch she owns 2 of. Everything we designed around per-item availability is pointless while the customer can order stock that doesn't exist.

**2. Move the date to the top of step 1.**
A single `Кога е празникът?` block sits above the category tabs — one date for „с монтаж", a pickup→return pair for „под наем". It drives the grid: with a date chosen, each tile knows how many of that item are actually free (`quantity − reserved on that range`), and tiles with nothing left render disabled with a `Заето за тази дата` badge.

Step 2 then holds contact details only. This is the change that turns the availability model from a backend idea into something the customer can feel, and it kills the awkward „монтажът се изчислява по-късно" hand-wave.

**3. Make the mode toggle do something, or delete it.**
- `Само под наем` → filter the grid to `rentable` items, show the pickup/return pair, no setup fee.
- `Украса с монтаж` → hide pickup/return (that's her logistics), add a setup/transport line to the summary.

Right now both modes produce identical totals and both show the same montage note. A control that changes nothing trains people to ignore the UI.

**4. Bring back the „2 часа преди събитието" question.** It was a stated condition for producing a final price and it's missing from step 2.

---

## P1 — the tile

**5. Quick-add morph.** A tile at qty 0 shows a single `Добави` button. On first add it becomes `− 1 +`. Twenty steppers all sitting at 0 is visual noise; one button per tile reads instantly and gives a clearer affordance. Standard SFCC quick-add behaviour.

**6. Colour swatches on the tile — not one tile per colour.**
`Калъф за арка · Бял / · Розов / · Син …` is currently seven separate tiles. Make it **one tile with a swatch strip**: clicking a swatch swaps the tile image, and the qty applies to the selected colour. Seven tiles collapse to one, it matches the PDP behaviour, and it stops fighting the `product_colors` schema the DB already has.

This is the change I'd argue hardest for — the flattened version doesn't scale. Add three more cover colours and that category becomes a wall of near-identical cards.

**7. Badges** — top-left of the image, one at a time, in priority order: `Заето за тази дата` → `Последен брой` (1 free) → `По запитване`.

**8. Keep the info line, make it consistent** — dimensions for arches, material for signs, „По индивидуална оферта" for custom work. It's doing real work; don't let it go empty on some tiles.

---

## P2 — polish

**9. Sticky mobile summary bar.** On phone the rail drops below the grid and the total disappears. Pin a slim bar to the bottom: total + CTA. Most of her traffic will be Instagram → phone.

**10. Persist the selection.** Put the build in `sessionStorage`. Clicking a product name navigates to the PDP — verify the selection survives coming back. If it doesn't, this is a P1 bug, not P2.

**11. `Изчисти всичко`** — a quiet reset link in the rail.

**12. Numbers and layout.** `font-variant-numeric: tabular-nums` on all prices and the total so digits don't jitter while stepping. Lock the tile image aspect ratio so the grid doesn't reflow as photos load.

**13. Accessibility.** Steppers keyboard-reachable, `aria-live="polite"` on the total so it announces when it changes. The `Добави X` / `Премахни X` labels already there are good — keep that pattern.
