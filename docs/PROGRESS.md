# Progress tracker

The single source of truth for **where the project stands**. `CLAUDE.md` says what we're
building and why; this file says what's actually done. Tick boxes as we go.

Order follows the build order in `CLAUDE.md` — steps 4–6 don't start until 1–3 are real
and visible.

Legend: `[x]` done · `[ ]` not started · **(you)** = your job, not Claude's.

**Last verified against the running app + live Supabase: 19 Sep 2026.**

---

## Where we are in one line

Steps 0–2 are done and verified against real Postgres. **The catalog PLP (`/catalog` +
`/catalog/[category]`) is now built and verified against live data (21 Sep 2026); the PDP
(`/product/[slug]`) is the main piece of step 3 still open.**

| Step | What | State |
|------|------|-------|
| 0 | Supabase project, schema, seed, storage, users | ✅ done + verified |
| 1 | Scaffold, tokens, Supabase clients, public shell | ✅ done |
| 2 | Homepage configurator → booking request | ✅ done + verified |
| 3 | Catalog PLP + PDP, real photos | 🟡 PLP (list + filters) built + verified; PDP not built |
| 4 | Admin auth + requests inbox | 🟡 auth done, inbox not started |
| 5 | Admin calendar + availability | ⬜ not started |
| 6 | Admin CRUD, gallery, deploy | 🟡 product/category CRUD done |

---

## Step 0 — Supabase setup **(you)** ✅

Live project connected, EU/Frankfurt. The homepage renders **live DB data** — verified by
reading the rendered DOM: 47 real UUIDs, not the fallback's slug ids.

- [x] Create the Supabase project (region: EU / Frankfurt)
- [x] SQL editor → run `schema.sql` — 7 categories, 18 products, RLS + RPCs live
- [x] SQL editor → run `seed.sql`
- [x] Storage → create bucket `catalog`, public read
- [ ] **Authentication → Providers → Email → turn OFF "Allow new users to sign up"** —
      verified `disable_signup: false` on 19 Sep 2026. Every admin RLS policy keys off
      `auth.role() = 'authenticated'`, so while sign-ups are open *anyone* who registers
      gets full read/write on the catalog and can read customer phone numbers.
      **Blocking for deploy.**
- [ ] Authentication → Users → your admin user (tick **Auto Confirm User** —
      `mailer_autoconfirm` is false, so an unconfirmed user can never log in)
- [ ] Authentication → Users → your wife's admin user
- [x] Fill `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- [ ] Delete the test booking row `a71e1c28-…` from the Table Editor (`bookings`)

### Verified directly against the live API (19 Sep 2026)

| Check | Result |
|---|---|
| `GET /rest/v1/categories` | 200 — 7 real categories with UUIDs |
| `POST /rest/v1/rpc/reserved_qty_all` | 200 — function is live, `security definer` works, anon can call it |
| `GET /rest/v1/bookings` | 200 `[]` — RLS correctly hides bookings from the public |
| `npm run build` | passes clean (Next 16.3.5, TS check included) |

> The availability RPC returns `[]` because **nothing is confirmed in the DB yet**. The
> non-empty branch — a date that actually reduces a tile's stock — has never run. Confirm
> a booking by hand in the Table Editor to test it before step 5.

---

## Step 1 — Scaffold, tokens, Supabase clients, public shell ✅

- [x] `create-next-app` (TS, Tailwind v4, App Router, ESLint, `src/`, `@/*`)
- [x] `@supabase/supabase-js` + `@supabase/ssr` installed
- [x] Design tokens in `globals.css` (mockup palette, not the original `DESIGN.md` one)
- [x] Fonts via `next/font`, `subsets: ["latin","cyrillic"]` (Unbounded + Nunito)
- [x] Browser + server Supabase clients in `src/lib/supabase/`
- [x] `.env.local.example` committed, `.env.local` ignored
- [x] Public layout: header nav (Начало, Каталог, Галерия, За нас) + contact footer
- [x] `/about` page
- [x] Placeholder pages so no nav link 404s

## Step 2 — Homepage configurator ✅

- [x] Configurator as the hero: tile grid, category pills, qty steppers, summary rail
- [x] Live „Примерна сума" rail with line items
- [x] Two-step flow: build + dates (1), contact details (2)
- [x] Category strip + gallery teaser + footer
- [x] Built from the DB (`getCatalog()`), not a hardcoded list
- [x] Submit writes `bookings` (status `requested`) + `booking_items`, then a thank-you
- [x] „ориентировъчна цена / final price at a personal meeting" disclaimer
- [x] DB write verified end-to-end — INSERT returned 201 against live Postgres

### Configurator P0 (per `CONFIGURATOR-IMPROVEMENTS.md`) ✅

- [x] 1 — `+` stops at `products.quantity`; tile shows `Налични: N`. Colours of one
      product share its stock, so six covers stay six however they're split.
- [x] 2 — „Кога е празникът?" at the top of step 1, wired to availability
      (`quantity − reserved_qty_all(from, to)`); 0 free renders the tile disabled with a
      `Заето за тази дата` badge, and a date that shrinks stock trims the selection.
- [x] 3 — mode toggle is real: „Само под наем" filters to `rentable` items and shows the
      pickup→return pair; „Украса с монтаж" adds a „Монтаж и транспорт" line.
- [x] 4 — „Може ли 2 часа преди събитието да дойдем за монтаж?" in step 2 (service only)
- [x] 9 (P2, pulled forward) — sticky mobile summary bar below `lg`
- [ ] **Price the setup/transport line** — reads „по запитване" because there's nowhere in
      the schema to put a number. Needs your decision, then a column.

P1 (quick-add morph, swatches on the tile, badges, info line) and the rest of P2
(sessionStorage, reset link, a11y) are untouched — see `CONFIGURATOR-IMPROVEMENTS.md`.

---

## Step 3 — Catalog (PLP + PDP) 🟡

**Photo plumbing is done** (19 Sep 2026) — `product_images` now flows from the DB through
`getCatalog()` into the configurator tiles, so uploading a photo makes it appear on the
homepage with no code change. See **"Adding product photos"** at the bottom of this file.

- [x] `product_images` in the catalog query, typed, with colour→image fallback
- [x] Configurator tiles render the photo (placeholder „Снимка предстои" when there is none)
- [x] `next.config.ts` allows the Supabase Storage host for `next/image`
- [x] Photos manageable from `/admin/products/[id]` — no SQL, no file naming
- [ ] Real photos uploaded **(her)** — nothing in `product_images` yet
- [x] `/catalog` — all products, client-side filters (category · colour · price · mode) +
      5 sorts, URL state (shareable/reloadable), active-filter chips, empty state, mobile
      filter bottom sheet. Built from `docs/design/plp/PLP-BRIEF.md`; verified against live
      data 21 Sep 2026.
- [x] `/catalog/[category]` — same page, category preselected; server-rendered for SEO
      (per-category `<title>`), then canonicalises onto `/catalog?cat=…`
- [x] Shared „оферта" selection store (`src/lib/selection.ts`, localStorage-backed) —
      „Добави" on a card writes to it and the „Вашата оферта" pill counts it, surviving the
      hop to the configurator. **TODO: the homepage Configurator still keeps its own local
      list and does not read this store yet — wiring it up is a separate task (the brief
      lists the configurator itself as out of scope).**
- [ ] Date / „Скрий заетите" availability filter on the PLP — **deliberately hidden**
      (brief): a date filter must reflect real per-date availability or be omitted, and
      `getReservedQuantities()` is unverified against live Postgres + fails open. The TODO
      sits in `src/components/catalog/Filters.tsx`; wire it when step 5 lands.
- [ ] `/product/[slug]` — PDP (the card image + name already link here)
- [ ] Colour swatches that swap the photo (per `catalog-and-images.md`)
- [ ] Image carousel when a product has more than one photo
- [ ] `/configurator` as its own page (today it lives only on the homepage)

## Step 4 — Admin: login + requests inbox 🟡

Auth is **built and working** — pulled forward so she can load photos and prices while the
catalog pages get built. The requests inbox is still untouched.

- [x] `/admin/login` — Supabase Auth (email + password)
- [x] `src/proxy.ts` for session refresh + guard — this is the "elsewhere" the `catch {}`
      in `supabase/server.ts` defers to. (Next 16 renamed the `middleware` convention to
      `proxy`; using the new one.)
- [x] Auth guard on `/admin/*` — logged out goes to login, logged in skips past it
- [ ] `/admin/requests` — incoming requests list
- [ ] Open a request: see items, colours, date, phone
- [ ] Confirm a request + set the final price
- [ ] Owner gets notified of a new request (email or Supabase)

## Step 5 — Admin: calendar + availability ⬜

- [ ] `/admin` dashboard with a month calendar of confirmed bookings
- [ ] Per-item availability (quantity minus what's booked on that date)
- [ ] Green/red at-a-glance colours (tokens already in `globals.css`)
- [ ] `blackout_dates` — table + RLS exist, nothing in the app touches it yet

## Step 6 — Admin CRUD, gallery, deploy 🟡

The product-management half is done (pulled forward with step 4). Gallery, SEO and deploy
are still open.

- [x] `/admin/products` — add/edit/hide products, `/admin/categories` for categories
- [x] Edit prices and quantities without touching Supabase
- [x] Upload product photos from the admin (resized in the browser, straight to Storage)
- [x] Crop photos to 4:5 on upload, and re-crop existing ones („Изрежи“)
- [x] Keep the whole photo next to the cropped tile (`full_path`); re-crop starts from it. Tighter 4:5 catalog cards
- [x] Manage colours/swatches per product
- [ ] `/gallery` — real past work, grouped by theme
- [ ] SEO meta + Open Graph (link previews for Instagram/Facebook)
- [ ] Responsive pass on a real phone
- [ ] Push to GitHub → import to Netlify → add the two env vars → deploy
- [ ] Point the domain at Netlify

---

## Smoke tests 🟡 built, one run so far

Six read-only Playwright specs in `tests/smoke/`. They browse like a visitor and never submit
a request, because the database is the live one. `/smoke-test` reports, `/smoke-fix` fixes one red
spec (uncommitted), `/ship-pr` ships the fix. How it works: `.claude/README.md`.

- [x] `@blocker` the homepage shows products from the database, not `FALLBACK_GROUPS`
- [x] `@critical` Bulgarian text uses the brand fonts (each one has a Cyrillic file)
- [x] `@critical` the configurator total adds up, and „по запитване" items add nothing
- [x] `@minor` /about shows the contacts from `contacts.ts`
- [x] `@minor` the mobile summary bar stays pinned on a phone viewport (390×844)
- [x] `@blocker` step 1 → step 2: the contact form opens with the date, city and estimate,
      and the send button is shut until a phone number is filled (never clicked)
- [x] **(you)** `@playwright/test` installed, `npx playwright install chromium` done
- [ ] **A green run of all six.** The first run (1 Oct) had the live-DB spec unable to start:
      `supabase-js` needs a global `WebSocket` (Node 22+) and this machine is on Node 20. It now
      reads the DB over plain REST instead, so **whether the homepage really reads live Postgres
      is still unconfirmed** — that is what the next `/smoke-test` answers.
- [ ] Spec for submitting a request (a `bookings` row + its `booking_items` land in the DB) —
      **parked**: it can only be proven by writing, so it needs a database that isn't the live one

## Housekeeping

- [ ] **Run `storage-policies.sql`** in the SQL editor **(you)** — BLOCKING for uploads.
      `storage.objects` has its own RLS, separate from the table policies in `schema.sql`.
      Until this runs, every upload fails with "new row violates row-level security policy"
      even though she's logged in.
- [ ] **Run `migration-euro-and-balloon-theme.sql`** in the SQL editor **(you)**. It marks
      the money columns as EUR and switches „Балони" to `picker = 'text'`: instead of a
      dropdown, the customer describes the theme in a text box, which is saved to
      `booking_items.custom_text`. Until it runs, balloons keep the old dropdown.
- [ ] **Re-price every product in admin (you).** The site switched from лв to € by
      relabelling only: the numbers were entered as лв and now show as € (60 лв → 60,00 €).
- [ ] **Commit the configurator work** — only 2 commits exist and the last one predates the
      whole refactor. ~674 insertions / 500 deletions sit uncommitted, plus 6 untracked
      files (`src/components/configurator/*`, `src/lib/format.ts`) and 2 untracked docs.
      There is no git remote.
- [ ] Delete `src/lib/catalog-fallback.ts` — live data is confirmed working, so it's dead
      weight now. (`Product.images` is optional purely because this file has none.)
- [ ] `CLAUDE.md` is stale — it still calls Step 0 "BLOCKING" and says `/admin` doesn't
      exist "yet" as if that were news. Refresh it once step 3 lands.
- [ ] Replace the contact placeholders in `src/lib/contacts.ts` (phone, email, socials)
- [ ] Replace the placeholder prices in `seed.sql` with real ones
- [ ] Upgrade Node 20.9 → 22 LTS (Supabase warns on every build)

## Out of scope for v1

Payments / Stripe · online booking commitments · customer accounts · blog · English version.

---

## Adding product photos

**Use the admin panel** — `/admin/products` → pick a product → Снимки → choose the colour
(or „Всички цветове") → pick the file → drag the 4:5 frame to choose what the tiles show
(the dashed middle is what the square views keep). It crops and resizes in the browser, names the file to the
`catalog-and-images.md` convention, uploads it and records the row. She never sees a path.

The naming convention it generates, for reference when looking at the bucket:

```
products/{product-slug}/01.webp                  # colour-agnostic
products/{product-slug}/{color-slug}--01.webp    # colour-specific
products/{product-slug}/full/01.webp             # the whole photo behind a tile
```

A photo attached to a colour wins for that swatch; otherwise the colour-agnostic one shows.

Each photo is stored twice: the cropped 4:5 tile and the whole photo (only shrunk) under `full/`.
„Изрежи" re-crops from the whole photo, so she can widen the frame again, not just tighten it. The new
tile gets a new file name (the old URL is cached) and the old tile is deleted; the whole photo never is.
Photos uploaded before this have no original (the admin grid shows „Няма оригинал"): re-upload them for
the best result.

**iPhone note:** `.heic` files only convert to webp in Safari. Uploading from Chrome on
Windows stores the original, which browsers can't display — upload from the phone, or
convert first.
