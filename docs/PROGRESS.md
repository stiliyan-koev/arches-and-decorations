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
| 2 | Configurator → booking request (homepage until v2, now hidden at `/configurator`) | ✅ done + verified |
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
- [x] **Authentication → Providers → Email → turn OFF "Allow new users to sign up"** —
      off (owner, 8 Oct 2026). Every admin RLS policy keys off
      `auth.role() = 'authenticated'`, so this must stay off: with sign-ups open *anyone*
      who registers gets full read/write on the catalog and can read customer phone numbers.
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

## Homepage v2 🟡 built, photos pending

The configurator is no longer the homepage — the catalog is the main flow. Design:
`reference/homepage-v2/`.

- [x] `/` — photo carousel (`HeroCarousel`), „Изчисли своята украса" + „Към каталога",
      „Вдъхнови се по повод" cards → `/gallery?tag=…`. Content in `src/lib/home.ts`.
- [x] Old homepage moved as-is to `/configurator` (`noindex`, not linked anywhere)
- [x] Footer „Конфигуратор" link removed; `--color-muted` darkened to pass WCAG AA
- [x] Hero carousel managed from `/admin/home`: upload (4:5 cropper), caption, ← → order,
      delete. Table `hero_photos`; files in `catalog` → `home/hero/`.
- [x] `migration-hero-photos.sql` run on the live DB
- [ ] Hero photos uploaded **(her)**
- [ ] Occasion card photos in `public/home/` + paths in `src/lib/home.ts` **(you)**
- [x] Catalog add-to-total logic (the new main flow): basket + mini-basket drawer on
      `/catalog`, order summary at `/request` (2 Oct 2026, see Step 3)
- [x] `/gallery` filters by `?tag=` (the occasion cards' slugs `rozhden-den`, `krashtene`,
      `parti` match once she creates tags with those names)
- [x] Photo library (`/admin/photos`): one original per photo, which the carousel, the gallery,
      the products and the showcases use. `migration-photo-library.sql` run on the live DB.
      On a DB from before these tables, run them in this order: hero-photos → gallery →
      photo-library → showcases. A fresh DB needs only `schema.sql`.
- [ ] Re-run `migration-photo-library.sql` once after release 1.2.0 is live **(you)** — it
      links photos the old admin uploaded in the meantime
- [x] Showcases („Вдъхнови се“, Oct 2026): `migration-showcases.sql` (run on the live DB 7 Oct),
      `/admin/showcases` (create, edit, ‹ › order, delete; up to 12 library photos each, first
      = cover), and „Вдъхнови се“ on `/`: three cards, each opening a popup with the text
      and every photo whole (✕ / Escape / backdrop / Back close it). Browser-checked on the live
      DB (admin) and with a local preview (popup, phone + desktop).
- [ ] Three showcases with photos created **(her)** — until then `/` shows „Вдъхнови се по повод“
- [ ] Cleanup once three are live: delete `OccasionCards` + `OCCASIONS`

## Step 2 — Configurator ✅ (was the homepage; now `/configurator`)

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
- [x] Basket („оферта“) store (`src/lib/selection.ts`, localStorage, `{slug, qty}` lines)
      — „Добави" on a card adds one and opens the **mini-basket** drawer (right side, full
      width on phones): what was added, −/+ per line (capped by stock and 20), „Премахни",
      running total, „Продължи към запитването →". The „Вашата оферта" pill reopens it.
- [x] `/request` — order summary instead of checkout: editable basket, „Украса с монтаж" /
      „Само под наем" (rental off when any line isn't `rentable`), event dates, contacts,
      then `submitRequest()` — `booking_items.qty` = the line qty, `line_price` = unit × qty.
      Over-stock for the chosen dates is a warning, not a block. Verified in the browser
      2 Oct 2026, **never submitted** (live DB). The hidden `/configurator` is untouched and
      does not share the basket.
- [x] Colour choice per basket line — swatches on the card, one line per colour, saved to
      `booking_items.color_id` (Oct 2026). Needs `migration-product-colors.sql` (below).
- [x] „Прозорец за изисквания“ per product (18 Oct 2026) — a checkbox on the product form.
      On, „Добави“ first opens „Опишете вашите изисквания“ (may be left empty); the text
      rides on the basket line, stays editable in the mini-basket and on `/request`, and is
      saved to `booking_items.custom_text`. Needs `migration-requirements.sql` (below).
      Until `/admin/requests` exists she reads it in Supabase, `booking_items.custom_text`.
- [x] „Украса с монтаж“ / „Само под наем“ moved out of the filters into a big switch at the
      top of `/catalog` (19 Oct 2026); the choice rides on to `/request` as `?mode=rent`.
      In „Украса с монтаж“ the basket adds a „Труд за украса“ label once (50 €), in the
      mini-basket, on `/request`, in the sum and in the owner's email. Price set at the top
      of admin → Каталог. Needs `migration-labour.sql` (below); until then it is a fixed
      50 € and saving it in admin fails.
- [ ] Date / „Скрий заетите" availability filter on the PLP — **deliberately hidden**
      (brief): a date filter must reflect real per-date availability or be omitted, and
      `getReservedQuantities()` is unverified against live Postgres + fails open. The TODO
      sits in `src/components/catalog/Filters.tsx`; wire it when step 5 lands.
- [ ] `/product/[slug]` — PDP (the card image + name already link here)
- [x] Colour swatches that swap the photo — on the catalog card (per `catalog-and-images.md`)
- [ ] Image carousel when a product has more than one photo
- [x] `/configurator` as its own page (moved there by homepage v2; hidden backup)

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
- [x] Owner gets notified of a new request — `submitRequest()` emails her the whole request
      through `sendOwnerEmail()` (Resend) once the booking is saved; needs `RESEND_API_KEY`

## Step 5 — Admin: calendar + availability ⬜

- [ ] `/admin` dashboard with a month calendar of confirmed bookings
- [ ] Per-item availability (quantity minus what's booked on that date)
- [ ] Green/red at-a-glance colours (tokens already in `globals.css`)
- [ ] `blackout_dates` — table + RLS exist, nothing in the app touches it yet

## Step 6 — Admin CRUD, gallery, deploy 🟡

The product-management half is done (pulled forward with step 4). The gallery is built;
SEO and deploy are still open.

- [x] `/admin/products` — add/edit/hide products, `/admin/categories` for categories
- [x] Edit prices and quantities without touching Supabase
- [x] Upload product photos from the admin (resized in the browser, straight to Storage)
- [x] Crop photos to 4:5 on upload, and re-crop existing ones („Изрежи“)
- [x] Keep the whole photo next to the cropped tile (`full_path`); re-crop starts from it. Tighter 4:5 catalog cards
- [x] Manage colours/swatches per product
- [x] „Има варианти по цвят“ switch, a count per colour, re-tag a photo's colour, colours in the list
- [x] `/gallery` — past work, filter chips per tag (only tags with photos), 4:5 grid,
      24 per page + „Покажи още“, full-screen viewer with ‹ › / arrow keys / swipe
- [x] `/admin/gallery` — tags (add/rename/delete), batch upload with tags (tile cut from the
      middle, no framing step), a search-as-you-type tag picker that can create tags
      (`TagPicker`), per-photo tag chips, „Избери снимки“ to add/remove a tag on or delete
      many photos at once, a „Без етикет“ filter, „Изрежи“, delete. Tables
      `gallery_photos`, `gallery_tags`, `gallery_photo_tags`; files in `catalog` → `gallery/`
- [x] `migration-gallery.sql` run on the live DB
- [ ] Gallery photos uploaded **(her)**
- [ ] SEO meta + Open Graph (link previews for Instagram/Facebook)
- [ ] Responsive pass on a real phone
- [ ] Push to GitHub → import to Netlify → add the two env vars → deploy
- [ ] Point the domain at Netlify

## Privacy (GDPR) 🟡

No cookie banner, on purpose: the public site sets no cookies, loads no third-party
script and keeps only the basket (`oferta.v1`) in localStorage, which is strictly
necessary. Nothing to ask consent for. **Adding analytics or a pixel means building a
consent banner first** and updating `/privacy`.

- [x] `/privacy` — the GDPR notice (who, what, why, legal basis, how long, processors,
      transfers, storage, rights, КЗЛД), linked from the footer and from both forms
      (19 Oct 2026). A notice line, no consent checkbox: the basis is the customer's own
      request, not consent.
- [x] `forget_old_requests()` — wipes name, phone, note and requirements 12 months after
      the event, nightly via pg_cron (`migration-retention.sql`, also in `schema.sql`)
- [ ] **Run `migration-retention.sql`** in the SQL editor **(you)** — `/privacy` already
      promises the 12 months. Check the next morning: `select * from cron.job_run_details
      order by start_time desc limit 5;`
- [ ] **Fill `CONTACTS.legalName`** in `src/lib/contacts.ts` **(you)** — the owner's full
      name, or the company name + ЕИК once registered. GDPR wants a real identity for the
      „администратор“; until then `/privacy` names the brand.
- [ ] Accept the data processing agreements (DPA) of Supabase, Resend and Netlify **(you)**
      — each publishes one; Supabase's is signed from the organisation settings.
- [ ] Request and contact-form emails in Gmail: delete them by hand within 12 months —
      request emails 12 months after the event, contact-form emails once answered and at
      the latest 12 months after the last message. `/privacy` promises both **(her)**
- [ ] ЗЕТ (e-commerce law) asks a business site for an email address; the site has none on
      purpose. Revisit when there's a real domain address.

---

## Smoke tests 🟡 built, one run so far

Seven read-only Playwright specs in `tests/smoke/`. They browse like a visitor and never submit
a request, because the database is the live one. `/smoke-test` reports, `/smoke-fix` fixes one red
spec (uncommitted), `/ship-pr` ships the fix. How it works: `.claude/README.md`.

- [x] `@blocker` the homepage shows products from the database, not `FALLBACK_GROUPS`
- [x] `@critical` Bulgarian text uses the brand fonts (each one has a Cyrillic file)
- [x] `@critical` the configurator total adds up, and „по запитване" items add nothing
- [x] `@minor` /about shows the contacts from `contacts.ts`
- [x] `@minor` the mobile summary bar stays pinned on a phone viewport (390×844)
- [x] `@critical` the basket: add two → drawer total, qty +, remove, carry over to `/request`
      with the same total and a shut send button (never clicked)
- [x] `@blocker` step 1 → step 2: the contact form opens with the date, city and estimate,
      and the send button is shut until a phone number is filled (never clicked)
- [x] `@critical` the homepage shows the showcases from the database (three with photos → open
      the first popup and close it; fewer → „Вдъхнови се по повод“)
- [x] **(you)** `@playwright/test` installed, `npx playwright install chromium` done
- [ ] **A green run of all six.** The first run (1 Oct) had the live-DB spec unable to start:
      `supabase-js` needs a global `WebSocket` (Node 22+) and this machine is on Node 20. It now
      reads the DB over plain REST instead, so **whether the homepage really reads live Postgres
      is still unconfirmed** — that is what the next `/smoke-test` answers.
- [ ] Spec for submitting a request (a `bookings` row + its `booking_items` land in the DB) —
      **parked**: it can only be proven by writing, so it needs a database that isn't the live one

## Housekeeping

- [ ] **Run `migration-admin-policies.sql`** in the SQL editor **(you)** — BLOCKING before
      this release goes live, and **run it after the other migrations**: it re-creates
      policies on their tables, and a missing table aborts the script, which makes the SQL
      editor roll the whole run back — nothing changes while the file looks like it ran.
      Every `admin all …` policy today says `auth.role() = 'authenticated'`, which is *any*
      account of the project; the migration adds an `admins` table, keys the policies off
      that instead, and does the same for the three write policies on the `catalog` storage
      bucket (today any account can overwrite or delete every image). **In the same SQL
      editor session, right after it:** open Authentication → Users in the dashboard and look
      at who is actually there — sign-up has been open on a live project, so the list can
      hold strangers and leftover test accounts, and promoting all of them would hand out
      exactly the access this migration removes. Insert your two uids by hand,
      `insert into admins (user_id) values ('…'),('…');`, and switch public sign-up off in
      the same sitting (Authentication → Sign In / Providers). The table starts empty, and
      until it holds your uid every save in /admin fails with "new row violates row-level
      security policy" — and because `bookings` / `booking_items` have no public read policy,
      only the admin one, **/admin/requests shows an empty list even when requests exist**,
      with no error to explain it. **The code is coupled to this file**: `requireAdmin()` in
      `src/app/admin/actions.ts` now calls the `is_admin()` rpc, so on a database where this
      migration has not run the function does not exist, the call errors and every admin
      action is denied (fails closed). It must run before, or together with, the deploy of
      this release, or /admin denies everything.
- [ ] **Run `storage-policies.sql`** in the SQL editor **(you)** — BLOCKING for uploads.
      `storage.objects` has its own RLS, separate from the table policies in `schema.sql`.
      Until this runs, every upload fails with "new row violates row-level security policy"
      even though she's logged in.
- [ ] **Run `migration-euro-and-balloon-theme.sql`** in the SQL editor **(you)**. It marks
      the money columns as EUR and switches „Балони" to `picker = 'text'`: instead of a
      dropdown, the customer describes the theme in a text box, which is saved to
      `booking_items.custom_text`. Until it runs, balloons keep the old dropdown.
- [ ] **Run `migration-product-colors.sql`** in the SQL editor **(you)** — BLOCKING, before
      the colour swatches go live: the catalog reads `products.has_colors` and
      `product_colors.quantity`, and without them it falls back to the hardcoded catalog.
      It does **not** turn colours on for anything: `has_colors` stays `false` on every
      product, and every colour starts with a count of 1. Order of work in admin, per
      product: **set the real count per colour first, then tick „Има варианти по цвят“.**
      A product's quantity is now the **sum** of its colours, so „Калъф за арка“ (6 owned,
      7 colours) left at 1 per colour would read as 7 free, and 6 copied into each colour
      would read as 42 — understating stock is safe, overstating double-books.
      Матални квадратни масички has one colour (Бял): leave „Има варианти по цвят“ unticked
      there if one swatch looks odd.
- [ ] **Run `migration-requirements.sql`** in the SQL editor **(you)** — BLOCKING, before
      the „Прозорец за изисквания“ code goes live: the catalog reads
      `products.asks_requirements`, and without it falls back to the hardcoded catalog (and
      the admin product page errors). Adds one column, off for every product.
- [ ] **Run `migration-labour.sql`** in the SQL editor **(you)**, after
      `migration-admin-policies.sql` — adds the one-row `settings` table holding the
      „Труд за украса“ price (starts at 50 €). Not blocking: the site falls back to 50 €.
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
