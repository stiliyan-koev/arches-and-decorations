# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Decoration & Arch Rental Site** — a site for a Varna event-decoration business. The **Project brief** at the bottom of this file is the source of truth for *what* we're building and *why* (it's hand-authored; the owner means every line — don't relitigate it). The sections directly below cover *how the code actually works today* and *how to run it*. When the brief and the code disagree, the code is the current reality and the brief is the plan.

## Commands

Windows + PowerShell. Node 20.9 today (Supabase wants 22 LTS — works, but warns).

```bash
npm run dev     # next dev — http://localhost:3000
npm run build   # next build (production compile + type-check)
npm run lint    # eslint (flat config, eslint-config-next)
npm start       # serve a production build
npm run smoke   # Playwright smoke specs against the production build (run npm run build first)
```

**Tests: smoke specs only.** [`tests/smoke/`](tests/smoke/) holds 6 read-only Playwright specs: `npm run build`, then `npm run smoke` (it serves the build on port 3100, so it doesn't clash with `npm run dev`). They browse like a visitor and never press „Изпрати запитване“, because the database is shared with the live site. No unit tests, no coverage targets; add a spec only for something a code review can't catch, and tag it `@blocker`, `@critical` or `@minor`. Beyond that, verify changes with `npm run build` (catches type errors) and by looking at the running dev server.

## Architecture — what the code actually does

**Data flows through one function with a built-in fallback.** [`getCatalog()`](src/lib/catalog.ts) is the single catalog read: one nested Supabase query (`categories → products → product_colors`, ordered by each table's `sort`). If Supabase env vars are missing, or the query errors or returns nothing, it returns [`FALLBACK_GROUPS`](src/lib/catalog-fallback.ts) — a hardcoded mirror of `seed.sql` — so the UI renders before a database exists. [`isSupabaseConfigured()`](src/lib/catalog.ts) is the gate. **Once the real DB is live, delete `src/lib/catalog-fallback.ts`.**

**The homepage points to the catalog; the configurator is a hidden backup.** [`src/app/(site)/page.tsx`](src/app/(site)/page.tsx) (a Server Component; reads `hero_photos` via `getHeroPhotos()`) renders a coverflow photo carousel (hand-rolled, Swiper-coverflow look, no library: [`HeroCarousel`](src/components/home/HeroCarousel.tsx)), the „Изчисли своята украса“ block with a „Към каталога“ button, and [`OccasionCards`](src/components/home/OccasionCards.tsx) linking to `/gallery?tag=…`. The carousel photos and their captions live in the `hero_photos` table (files in the `catalog` bucket under `home/hero/`), managed at [`/admin/home`](src/app/admin/home/page.tsx) and read by [`getHeroPhotos()`](src/lib/hero-photos.ts), which falls back to pastel placeholder tiles while the table is empty or missing. The occasion cards' copy lives in [`src/lib/home.ts`](src/lib/home.ts) (`src: null` = placeholder until real photos land in `public/home/`). The old configurator homepage moved as-is to [`/configurator`](src/app/(site)/configurator/page.tsx): `noindex`, linked from nowhere. The catalog is the main flow (see the basket paragraph below). `/gallery` shows past work filtered by `?tag=` (tables `gallery_photos` / `gallery_tags` / `gallery_photo_tags` from `migration-gallery.sql`, read by [`gallery-photos.ts`](src/lib/gallery-photos.ts), managed at [`/admin/gallery`](src/app/admin/gallery/page.tsx)); until the tables exist it shows `Очаквайте скоро`.

**The catalog's basket is localStorage, the request page is the checkout.** [`selection.ts`](src/lib/selection.ts) holds `{slug, qty}` lines (key `oferta.v1`; old bare-slug lists read as qty 1) behind `useSyncExternalStore`. On `/catalog`, „Добави“ adds a line and opens [`MiniBasket`](src/components/basket/MiniBasket.tsx), a right-side drawer. „Продължи“ goes to [`/request`](src/app/(site)/request/page.tsx), where [`RequestForm`](src/components/basket/RequestForm.tsx) shows the editable lines, the service/rental toggle, [`EventDetails`](src/components/configurator/EventDetails.tsx) (`mode` prop) and `ContactForm`, then calls the same `submitRequest()`. [`basketView()`](src/lib/catalog-plp.ts) joins lines with the catalog and does the math for both; qty is capped by `PlpProduct.maxQty` (stock, and `MAX_PER_LINE` = `MAX_QTY` in `actions.ts`).

**Configurator state is minimal and derived.** [`Configurator.tsx`](src/components/Configurator.tsx) (`"use client"`) holds one `Selection` per category group in `useState`; the running total, line items, and quote flags are all recomputed from `selections` on each render — no extra bookkeeping. `pricing_type: "custom_quote"` items (and the custom-figure field) show "по запитване" and don't add to the number.

**Submitting a request generates its own id (RLS gotcha).** [`submitRequest()`](src/app/actions.ts) (a `"use server"` action) inserts a `bookings` row then its `booking_items`. It creates the booking UUID with `crypto.randomUUID()` instead of reading it back, because RLS lets the public `INSERT` a booking but never `SELECT` one — a `.select()` after insert would be rejected. Public inserts **must** carry `status: 'requested'` (enforced by the RLS `with check`).

**Two Supabase clients, both anon-key, RLS is the guard.** [`lib/supabase/client.ts`](src/lib/supabase/client.ts) for Client Components; [`lib/supabase/server.ts`](src/lib/supabase/server.ts) for RSC / route handlers / actions (async, because Next 16's `cookies()` is async). The anon key is safe in the browser — [`schema.sql`](schema.sql) RLS policies are what actually protect the tables.

**Availability is computed in SQL, not stored.** The `reserved_qty(product, from, to)` function in [`schema.sql`](schema.sql) sums qty across **confirmed** bookings whose date range overlaps; available = `products.quantity − reserved_qty(...)`, and `track_availability = false` items (e.g. balloons) are always available. No application code consumes this yet — it lands with the admin calendar (build step 5).

**Design tokens live in CSS, wired through Tailwind v4.** [`globals.css`](src/app/globals.css) defines tokens in an `@theme` block, so `--color-ink` → `text-ink`/`bg-ink`, `--radius-card` → `rounded-card`, etc. **These come from [`reference/homepage-mockup.html`](reference/homepage-mockup.html), not the palette in `DESIGN.md`.** Fonts are **Unbounded** (display) + **Nunito** (body), both with the Cyrillic subset (required, or BG text renders as tofu) — also different from DESIGN.md's Playfair/Inter. There is deliberately **no dark mode**. Treat `DESIGN.md` as an earlier proposal; the code is what shipped.

**Contacts are placeholders in one file.** Phone, email, socials, city all live in [`src/lib/contacts.ts`](src/lib/contacts.ts) — the single source for the header and footer. Still dummy values.

## Current state & where to look

[`docs/PROGRESS.md`](docs/PROGRESS.md) is the live checklist — read it before picking up work. In short:

- **Steps 1–2 are done**: scaffold, tokens, Supabase clients, public shell, and the configurator (built from `getCatalog()`, submits to `bookings`/`booking_items`). It was the homepage until v2; now it sits at the hidden `/configurator`.
- **Step 0 (Supabase project, run `schema.sql` + `seed.sql`, create the `catalog` Storage bucket, add admin users) is the owner's job and is BLOCKING** — the DB write path has never run against real Postgres, so anything downstream is unverified.
- **Steps 3–6 (catalog PLP/PDP, admin auth + requests, calendar + availability, CRUD + gallery + deploy) are not started.** Don't build steps 4–6 before 1–3 are real and visible.

## Companion docs

- [`docs/PROGRESS.md`](docs/PROGRESS.md) — the running checklist; keep it in sync as you complete work.
- [`GETTING-STARTED.md`](GETTING-STARTED.md) — cold-start setup (Supabase, env vars, deploy) and the intended file tree.
- [`schema.sql`](schema.sql) / [`seed.sql`](seed.sql) — DB schema (+ RLS + `reserved_qty`) and seed data; run in the Supabase SQL editor.
- [`catalog-and-images.md`](catalog-and-images.md) — category tree, seed product list, image naming/storage convention, and the swatch→image logic for the PDP.
- [`DESIGN.md`](DESIGN.md) — original brand/design proposal (superseded in part by the code — see above).

---

## Project brief — Decoration & Arch Rental Site

Read this first. It's the source of truth for what we're building and how.

### What this is
A site for a Varna event-decoration business (balloon decorations, arches; birthdays, christenings, weddings). Two surfaces in one app:

1. **Public site — informational.** Customers browse what's offered and get an *approximate* price from a configurator. There are **no payments and no online transactions.** Final price, availability, and payment are settled at a personal meeting. The public site's only job is to inform and capture a contact/meeting request (a lead, not an order).
2. **Admin — the real value.** An ops tool so the decorator (non-technical) can manage products, images, and a booking calendar herself, and see per-item availability at a glance.

### Stack (decided — don't relitigate)
- **Next.js (App Router)** + **TypeScript** + **Tailwind CSS**
- **Supabase** — Postgres (data), Auth (admin login), Storage (images)
- **Netlify** free tier for hosting
- No other frameworks, no state-management libs, no CMS. Keep the dependency list short.

### Principles (the owner is a senior dev; he means these)
- **Simple, human-readable code.** No clever abstractions, no premature generalization. A junior should be able to read any file top to bottom and get it.
- Server Components by default. Reach for `"use client"` only where there's real interactivity (configurator, admin forms, carousel).
- Talk to Supabase through one thin client in `lib/supabase/`. No repository/service-layer ceremony for a site this size.
- **BG for all UI text, English for code** (identifiers, routes, comments). Product/category *slugs* are data and can be BG-transliterated.
- Prices/quantities live in the DB and are edited via admin — never hardcode catalog data in the repo.

### Routes
Public:
- `/` — home
- `/about` — about + contacts ("За нас" / контакти)
- `/gallery` — past work, by theme ("Галерия")
- `/catalog` and `/catalog/[category]` — PLP
- `/product/[slug]` — PDP: color swatches + image carousel
- `/configurator` — pick items → live approximate price → contact/meeting request

Admin (auth-gated, `/admin/*`):
- `/admin` — dashboard + booking calendar
- `/admin/requests` — incoming requests: confirm, set final price
- `/admin/products` — product + category CRUD, image upload
- `/admin/login`

### Data model
See `schema.sql` (runnable in the Supabase SQL editor). Key idea:
**availability is computed, not stored** — an item is free on date D when
`product.quantity − Σ(qty in confirmed bookings whose date range covers D) > 0`.
Service bookings occupy `[event_date, event_date]`; rentals occupy `[start_date, end_date]`.
The admin calendar just renders confirmed bookings; the owner eyeballs it and confirms manually (no automated public-facing blocking in v1).

### Catalog + images
See `catalog-and-images.md` for the category tree, the seed product list, and the image naming/storage convention. Swatch selection swaps the PDP image by matching the selected color's images.

### Build order (ship value early)
1. **Scaffold** — `create-next-app` (TS, Tailwind, App Router). Create a Supabase project, run `schema.sql`, wire env vars. Static home + about.
2. **Catalog** — categories/products from DB → PLP + PDP (swatches + carousel). Seed a handful of products.
3. **Configurator** — select items → live estimate (labeled "ориентировъчна цена") → contact/meeting request form → writes a `bookings` row (status `requested`) + notifies the owner (email or Supabase → simple).
4. **Admin auth + requests inbox** — Supabase Auth, requests list, confirm + set final price.
5. **Admin calendar + availability** — month view of confirmed bookings; per-item availability query.
6. **Admin CRUD + gallery + polish** — product/category CRUD, image upload to Storage, gallery page, SEO meta, responsive pass, deploy to Netlify.

Don't build steps 4–6 before 1–3 are real and visible.

### Out of scope for now
Payments / Stripe, online booking commitments, blog, multi-language toggle (BG only), user accounts for customers.

## Agent workflow (PR pipeline)

Branches: `main` is live and only the owner merges into it. Work goes into one open `release/X.Y.Z` branch (cut from `main`) as small PRs by agents. The owner merges `release/X.Y.Z` → `main` (normal merge), then tags `vX.Y.Z`. Tags are the rollback points. No `develop` branch. Plan + progress: `pr-plan.md` (local only, git-excluded).
Run `/ship-next-pr` (one chunk) or `/ship-next-pr all`. How it works and why: [`.claude/README.md`](.claude/README.md).
Smoke tests sit outside that pipeline: `/smoke-test` reports (changes nothing) → `/smoke-fix` fixes ONE red spec in `src/`, uncommitted, without touching the spec → `/ship-pr` ships it.
No AI attribution: commit messages get no `Co-Authored-By:` trailer and PR bodies no "Generated with Claude Code" line (also switched off via `attribution` in `.claude/settings.json`).
`gh` lives at `C:\Program Files\GitHub CLI\gh.exe` and is not always on PATH: `$env:Path += ";C:\Program Files\GitHub CLI"`.
