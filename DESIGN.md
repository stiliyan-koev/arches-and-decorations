# Design & brand — starting point

Direction: **joyful but elegant.** Big photos, lots of whitespace, soft rounded shapes, one warm accent. Not childish, not corporate. The products are colorful, so the UI stays calm and lets the photos carry the color.

This is a proposed starting point — adjust with your wife once you see it on screen.

## Color tokens
Paste into `globals.css`. (Tailwind v4: expose them via `@theme` so you get `bg-bg`, `text-ink`, etc.)
```css
:root {
  --color-bg:            #FBF7F4;  /* warm off-white page background */
  --color-surface:       #FFFFFF;  /* cards, panels */
  --color-ink:           #2B2B2E;  /* primary text */
  --color-muted:         #6B6B70;  /* secondary text */
  --color-primary:       #D98BA4;  /* blush rose — brand, buttons, links */
  --color-primary-strong:#C76B84;  /* hover / pressed */
  --color-accent:        #D4A24E;  /* warm gold — use sparingly (dividers, small highlights) */
  --color-border:        #ECE4DE;
  /* admin calendar states */
  --color-available:     #4C9A6A;
  --color-booked:        #C0553B;
}
```

## Typography
Load with `next/font/google`, and **include the Cyrillic subset** — Bulgarian text needs it or you get tofu boxes:
```ts
import { Playfair_Display, Inter } from "next/font/google";
const heading = Playfair_Display({ subsets: ["latin", "cyrillic"], weight: ["600","700"] });
const body    = Inter({ subsets: ["latin", "cyrillic"] });
```
- **Headings:** Playfair Display (elegant serif, has Cyrillic — reads "events/weddings").
- **Body/UI:** Inter (clean, excellent Cyrillic).
- Want more modern/playful instead of the serif? Swap headings to **Manrope** (also Cyrillic). Pick one and commit.

## Layout & shape
- Generous whitespace; content max-width ~1120px; comfortable line-length for BG text.
- Radius: `--radius: 1rem` (16px) on cards; buttons are pill-shaped (`rounded-full`).
- Shadows: soft and low (`0 4px 20px rgba(0,0,0,.06)`), never harsh.
- Mobile-first — most customers arrive from Instagram/Facebook on a phone.

## Components
- **Buttons:** primary = solid blush, white text, pill; hover → `--color-primary-strong`. Secondary = outline in `--color-border`.
- **Product card:** photo on top (4:3), name, short line, price or "по запитване"; whole card is a link.
- **Swatches:** small round chips filled with `product_colors.hex`; pattern colors (Elsa castle, blue-check) show a tiny image tile instead of a flat color; selected chip gets a ring in `--color-ink`.
- **Carousel:** simple, swipeable on mobile, dots underneath. No autoplay.
- **Calendar (admin):** month grid; confirmed bookings as chips; use `--color-available` / `--color-booked` for at-a-glance item status.

## Imagery
Photos are the product. Shoot/crop consistently (same aspect ratios), good light, plain backgrounds where possible. Serve `webp` through `next/image`. This matters more than any UI detail.

## Copy tone (BG)
Warm, simple, first person ("Изработваме…", "Свържете се с нас"). Short sentences. Always label the configurator number as approximate ("Ориентировъчна цена") and invite a personal meeting for the final offer.
