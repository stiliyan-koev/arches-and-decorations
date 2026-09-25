# Catalog + image convention

## Category tree (BG display / english slug)
1. **Арки** — `arches`
2. **Калъфи за арки** — `covers`
3. **Балони** — `balloons`
4. **Фигури с балони** — `balloon-figures`
5. **Фигурки герои** — `character-figures`
6. **Надписи и табели** — `signs`
7. **Аксесоари** — `props`

## Seed product list (map from the owner's inventory)
Prices are `TBD` — the owner/wife fills them via admin. `quantity` reflects how many she owns.

**Арки (`arches`)**
- `arch-oval-180x80` — Овална арка 180×80 см — qty 2
- `arch-oval-165x50` — Овална арка 165×50 см — qty 2
- `arch-round-180` — Кръгла арка 180 см — qty 3

**Калъфи за арки (`covers`)** — one product, colors as swatches
- `arch-cover` — Калъф за арка — colors below (this is the canonical swatch example)
  - white `бял` #FFFFFF · red `червен` #D33 · yellow `жълт` #F2C200 · blue `син` #2E6FD6 · pink `розов` #E68AB8 · `elsa-castle` (Замък на Елза, pattern → hex null) · `blue-check` (Син на квадратчета, pattern → hex null)

**Балони (`balloons`)** — consumable → `track_availability=false`
- `balloons` — Балони (различни цветове) — colors as swatches, qty irrelevant

**Фигури с балони (`balloon-figures`)**
- `figure-number-1` — Цифра „1" с кухина за балони — qty 1

**Фигурки герои (`character-figures`)** — each with a stand, qty 1
- `figure-winnie` — Мечо Пух и приятели
- `figure-baby-boss-1` — Baby Boss (единица)
- `figure-elsa` — Елза
- `figure-anna` — Анна
- `figure-olaf-sven` — Олаф и Свен
> Note: these are licensed characters. Listing physically-owned figurines is common locally; naming them commercially is a gray area — owner's call.

**Надписи и табели (`signs`)** — `pricing_type='custom_quote'` (price on request)
- `sign-happy-birthday` — Надпис „Happy Birthday" / рожден ден
- `sign-christening` — Надпис за кръщене
- `sign-bride-to-be` — Надпис „Bride to be"
- `table-signs-pink` — Табелки за маса (розови)

**Аксесоари (`props`)**
- `photo-mirror` — Огледало за снимки — qty 1
- `sign-stand` — Стойка за табели — qty 1
- `easel` — Статив — colors/variants: `wood` (дървен), `metal` (метален)

## Image naming + storage
Supabase Storage bucket `catalog` (public read). Folder-per-product keeps names short and unambiguous.

```
products/{product-slug}/{NN}.webp                    # color-agnostic / base image
products/{product-slug}/{color-slug}--{NN}.webp      # color-specific image
products/{product-slug}/full/{color-slug--}{NN}.webp # the whole photo behind a tile, same name
gallery/{theme-slug}/{NN}.webp                        # past-work gallery, grouped by theme
```

Rules:
- lowercase, ASCII, `webp`, two-digit index `01`, `02`, …
- `--` separates the color segment from the index (slugs may contain single `-`)
- Examples: `products/arch-cover/red--01.webp`, `products/arch-cover/elsa-castle--01.webp`, `products/figure-elsa/01.webp`, `gallery/frozen-theme/03.webp`

### Tile vs full
Each product photo is two files:
- **tile** (`product_images.path`): the 4:5 portrait crop, max 1200px tall.
- **full** (`product_images.full_path`): the whole photo, only shrunk (max 2000px long side), under `full/`.
- Saved "Без изрязване" = one file: `path` and `full_path` both point at the `full/` file.
- Re-crop cuts a new tile from the full file and saves it under a new `NN`; the full file never changes.
- Old rows have `full_path = null` (the original was never kept); `fullImagePath()` falls back to the tile.

Rule of thumb: **grids and cards → tile, anything "look closer" → full.**

## Swatch → image logic (PDP)
1. Load `product_images` for the product.
2. When a swatch (a `product_colors` row) is selected, show images whose `color_id` matches; if that color has none, fall back to the base images (`color_id null`).
3. 1 image → single frame; >1 → carousel. Swatch fill = `product_colors.hex` (render a pattern tile when `hex` is null).
