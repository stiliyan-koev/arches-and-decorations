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
npm run db-check  # read-only: has every migration-*.sql been run on the DB in .env.local? (before a release)
```

**Tests: smoke specs only.** [`tests/smoke/`](tests/smoke/) holds 7 read-only Playwright specs: `npm run build`, then `npm run smoke` (it serves the build on port 3100, so it doesn't clash with `npm run dev`). They browse like a visitor and never press „Изпрати запитване“, because the database is shared with the live site. The admin is covered only from outside (no session → redirected to `/admin/login`); the specs never log in. The old configurator specs sit in [`tests/archive/configurator/`](tests/archive/configurator/), which Playwright doesn't run. No unit tests, no coverage targets; add a spec only for something a code review can't catch, and tag it `@blocker`, `@critical` or `@minor`. Beyond that, verify changes with `npm run build` (catches type errors) and by looking at the running dev server.

## Architecture — what the code actually does

**Data flows through one function with a built-in fallback.** [`getCatalog()`](src/lib/catalog.ts) is the single catalog read: one nested Supabase query (`categories → products → product_colors`, ordered by each table's `sort`). If Supabase env vars are missing, or the query errors or returns nothing, it returns [`FALLBACK_GROUPS`](src/lib/catalog-fallback.ts) — a hardcoded mirror of `seed.sql` — so the UI renders before a database exists. [`isSupabaseConfigured()`](src/lib/catalog.ts) is the gate. **Once the real DB is live, delete `src/lib/catalog-fallback.ts`.**

**The homepage points to the catalog; the configurator is a hidden backup.** [`src/app/(site)/page.tsx`](src/app/(site)/page.tsx) (a Server Component; reads `hero_photos` via `getHeroPhotos()`) renders a coverflow photo carousel (hand-rolled, Swiper-coverflow look, no library: [`HeroCarousel`](src/components/home/HeroCarousel.tsx)), the „Изчисли своята украса“ block with a „Към каталога“ button, and „Вдъхнови се“: [`ShowcaseCards`](src/components/home/ShowcaseCards.tsx), three finished decorations. Each card is one button that opens a native `<dialog>` with the title, the plain-text body (a blank line = a new paragraph) and every photo whole; Back closes it (a pushed history entry), the page behind is locked. The showcases live in `showcases` / `showcase_photos` (from `migration-showcases.sql`; the photos are library photos, no tiles, the card crops the first one with CSS), managed at [`/admin/showcases`](src/app/admin/showcases/page.tsx) and read by [`getHomeShowcases()`](src/lib/showcases.ts). Each one also has its own page, [`/showcases/<slug>`](src/app/(site)/showcases/[slug]/page.tsx), for search and sharing: `showcases.slug` (from `migration-showcase-slug.sql`) is made from the title when the showcase is created and then kept, so a later title edit doesn't break links. The popup links to it, each showcase page lists the others under „Още украси“ (so those past the homepage's three are linked too), and the sitemap lists it. The page shows them only when exactly `HOME_SHOWCASE_COUNT` (3) have a photo; until then — or on any DB error — it falls back to [`OccasionCards`](src/components/home/OccasionCards.tsx) linking to `/gallery?tag=…`, which go once three showcases are live. Under it is the FAQ: [`Faq`](src/components/Faq.tsx), with the text in [`src/lib/faq.ts`](src/lib/faq.ts), is the same component as on [`/faq`](src/app/(site)/faq/page.tsx). Each group (closed by default) and each question in it is a native `<details>`, and only `/faq` carries the `FAQPage` JSON-LD. The carousel photos and their captions live in the `hero_photos` table (files in the `catalog` bucket under `home/hero/`), managed at [`/admin/home`](src/app/admin/home/page.tsx) and read by [`getHeroPhotos()`](src/lib/hero-photos.ts), which falls back to pastel placeholder tiles while the table is empty or missing. The occasion cards' copy lives in [`src/lib/home.ts`](src/lib/home.ts) (`src: null` = placeholder until real photos land in `public/home/`). The old configurator homepage moved as-is to [`/configurator`](src/app/(site)/configurator/page.tsx): `noindex`, linked from nowhere. The catalog is the main flow (see the basket paragraph below). `/gallery` shows past work filtered by `?tag=` (tables `gallery_photos` / `gallery_tags` / `gallery_photo_tags` from `migration-gallery.sql`, read by [`gallery-photos.ts`](src/lib/gallery-photos.ts), managed at [`/admin/gallery`](src/app/admin/gallery/page.tsx)); until the tables exist it shows `Очаквайте скоро`. Each tag can have a text (`gallery_tags.description`, from `migration-gallery-tag-description.sql`), edited next to its name in `/admin/gallery`; `/gallery?tag=…` shows it under the heading and uses it as the meta description, and an empty one falls back to the general text.

**The catalog's basket is localStorage, the request page is the checkout.** [`selection.ts`](src/lib/selection.ts) holds `{slug, color, qty, requirements}` lines (key `oferta.v1`; old bare-slug lists read as qty 1, old lines without a colour as `color: null`, without requirements as `""`) behind `useSyncExternalStore`. A product with colours is one line per colour. A product with `products.asks_requirements` („Прозорец за изисквания“ on the product form, from `migration-requirements.sql`) opens [`RequirementsDialog`](src/components/catalog/RequirementsDialog.tsx) on „Добави“ („Опишете вашите изисквания“, may be left empty); the text rides on the line, stays editable in `BasketLines`, and is saved to `booking_items.custom_text` (the column the configurator's balloon theme uses). On `/catalog`, „Добави“ adds a line and opens [`MiniBasket`](src/components/basket/MiniBasket.tsx), a right-side drawer. „Продължи“ goes to [`/request`](src/app/(site)/request/page.tsx), where [`RequestForm`](src/components/basket/RequestForm.tsx) shows the editable lines, the service/rental toggle, [`EventDetails`](src/components/configurator/EventDetails.tsx) (`mode` prop) and `ContactForm`, then calls the same `submitRequest()`. [`basketView()`](src/lib/catalog-plp.ts) joins lines with the catalog and does the math for both; qty is capped by `PlpProduct.maxQty`, or the colour's `PlpSwatch.maxQty` (stock, and `MAX_PER_LINE` = `MAX_QTY` in `actions.ts`).

**The mode switch and „Труд за украса“.** „Украса с монтаж“ / „Само под наем“ is [`ModeSwitch`](src/components/catalog/ModeSwitch.tsx) at the top of `/catalog` (not a filter: „Изчисти“ keeps it). Each mode hides what it can't take ([`baseList()`](src/lib/catalog-plp.ts)): „Само под наем“ the setup-only products, „Украса с монтаж“ the rent-only ones. It is `?mode=rent` in the URL and rides on to `/request` the same way, where `RequestForm` starts in it. A basket going as „Украса с монтаж“ (see [`hasLabour()`](src/lib/catalog-plp.ts)) gets one [`LabourLabel`](src/components/basket/LabourLabel.tsx): no qty, no „Премахни“, added to the sum and the owner's email (`labourPrice` in the payload). The price is the one row of `settings` (from `migration-labour.sql`), read by [`getLabourPrice()`](src/lib/settings.ts) with a 50 € fallback, and edited at the top of `/admin/products`; 0 = no label.

**„Под наем“ can be switched off for the whole site.** [`RentToggle`](src/components/admin/RentToggle.tsx) at the top of `/admin/products` saves `settings.rent_enabled` (from `migration-rent-toggle.sql`), read by [`getRentEnabled()`](src/lib/settings.ts), which stays on if it can't be read. Off, [`toPlpData()`](src/lib/catalog-plp.ts) leaves out the rent-only products (and categories and colours only they had), `ModeSwitch` and the choice on `/request` disappear, `?mode=rent` is ignored, and a rent-only category's page redirects to `/catalog` (temporary, not a 404). The products stay in the database and in visitors' baskets, and come back when she switches it on. The hidden `/configurator` and the text that mentions renting (footer, `/about`, `/faq`, the `/catalog` meta description) don't follow the switch.

**Colours are a per-product switch with per-colour stock.** `products.has_colors` („Има варианти по цвят“ on the product form, from `migration-product-colors.sql`) turns them on; off = the `product_colors` rows stay but `getCatalog()` returns `colors: []`. Each colour has its own `product_colors.quantity`, and `getCatalog()` makes the product's `quantity` their sum. On the catalog card the colours are [`Swatches`](src/components/Swatches.tsx); the chosen colour's photos (`product_images.color_id`, set per photo in the admin's „Снимки“) replace the card's photo, and a colour without photos keeps it. The request saves the colour in `booking_items.color_id`.

**How a product is offered, and arch covers.** `products.offer_mode` (from `migration-offer-mode.sql`; „Как се предлага“ on the product form) is `rent` (Може под наем), `both` (С монтаж от нас) or `setup` (Само с монтаж от нас); admin keeps the old `rentable`/`service_only` in step. On `/request` a basket can only take the modes every line allows, and a rent-only line next to a setup-only one blocks sending. `products.covers_needed` is how many covers one piece needs (a set of 2 arches: 2); the covers are the category an arch's category recommends (`recommend_category_id`), and [`coverShortfall()`](src/lib/catalog-plp.ts) warns in the basket when there are too few.

**Configurator state is minimal and derived.** [`Configurator.tsx`](src/components/Configurator.tsx) (`"use client"`) holds one `Selection` per category group in `useState`; the running total, line items, and quote flags are all recomputed from `selections` on each render — no extra bookkeeping. `pricing_type: "custom_quote"` items (and the custom-figure field) show "по запитване" and don't add to the number.

**Submitting a request generates its own id (RLS gotcha).** [`submitRequest()`](src/app/actions.ts) (a `"use server"` action) inserts a `bookings` row then its `booking_items`. It creates the booking UUID with `crypto.randomUUID()` instead of reading it back, because RLS lets the public `INSERT` a booking but never `SELECT` one — a `.select()` after insert would be rejected. Public inserts **must** carry `status: 'requested'` (enforced by the RLS `with check`). Once both inserts succeed it emails the owner the whole request (names, colours, requirements, dates, phone) through [`sendOwnerEmail()`](src/lib/mail.ts), inside `after()` so the customer never waits on Resend, under `allowSend()` like the contact form but with its own caps (`requestSends`), so contact-form spam can't stop these emails; a failed or throttled email is only logged, because the booking is already saved.

**Two Supabase clients, both anon-key, RLS is the guard.** [`lib/supabase/client.ts`](src/lib/supabase/client.ts) for Client Components; [`lib/supabase/server.ts`](src/lib/supabase/server.ts) for RSC / route handlers / actions (async, because Next 16's `cookies()` is async). The anon key is safe in the browser — [`schema.sql`](schema.sql) RLS policies are what actually protect the tables.

**Availability is computed in SQL, not stored.** The `reserved_qty(product, from, to)` function in [`schema.sql`](schema.sql) sums qty across **confirmed** bookings whose date range overlaps; available = `products.quantity − reserved_qty(...)`, and `track_availability = false` items (e.g. balloons) are always available. `reserved_qty_by_color(from, to)` does the same per colour (`product_colors.quantity − …`); `/request` reads both (`getReservedQuantities` / `getReservedColorQuantities` in `actions.ts`) for its over-stock warnings. The admin calendar (build step 5) is not built yet.

**Design tokens live in CSS, wired through Tailwind v4.** [`globals.css`](src/app/globals.css) defines tokens in an `@theme` block, so `--color-ink` → `text-ink`/`bg-ink`, `--radius-card` → `rounded-card`, etc. **These come from [`reference/homepage-mockup.html`](reference/homepage-mockup.html), not the palette in `DESIGN.md`.** Fonts are **Unbounded** (display) + **Nunito** (body), both with the Cyrillic subset (required, or BG text renders as tofu) — also different from DESIGN.md's Playfair/Inter. There is deliberately **no dark mode**. Treat `DESIGN.md` as an earlier proposal; the code is what shipped.

**Contacts live in one file; there is deliberately no email address.** Phone, Viber, Messenger, socials and city are in [`src/lib/contacts.ts`](src/lib/contacts.ts) — the single source for the header, footer and `/about`. Messenger and Viber are the preferred channels and lead the contact box; the Viber link (`viber://chat?number=…`) only does anything where Viber is installed, so the number itself stays a plain `tel:` link. Instead of publishing an email address, `/about` carries [`ContactMessageForm`](src/components/about/ContactMessageForm.tsx) → `submitContactMessage()` in [`actions.ts`](src/app/actions.ts) → [`sendOwnerEmail()`](src/lib/mail.ts), which POSTs to Resend's REST API (no npm package) and mails the owner. Nothing is stored: with `RESEND_API_KEY` unset, or on any Resend error, the visitor is told to write on Messenger/Viber or call. A hidden honeypot field drops bot submissions silently.

**Domain, hosting and who the email comes from.** The site is **ukrasivarna.com**, bought in October 2026 for one year, hosted on Netlify (jump.bg is only the registrar; the nameservers point at Netlify DNS, so every DNS record is added there). The domain is verified in Resend — DKIM `TXT`, two `CNAME`s (`send`, `rsend`) and a `_dmarc` `TXT` — so mail goes out as `SENDER` in [`src/lib/mail.ts`](src/lib/mail.ts), from our own domain, not the shared `onboarding@resend.dev`. There's no mailbox behind that address, and only the `/about` contact form (which asks for an email) sets `reply_to`, so a reply to it reaches the customer; a request email has no `reply_to` at all, so replying to one bounces — the customer is reached on the phone number in the body. Everything lands in `OWNER_EMAIL`, the address the Resend account was opened with. `CONTACT_EMAIL_FROM` / `CONTACT_EMAIL_TO` override either without a code change.

**Privacy: a GDPR notice, and a cookie banner only for Google Ads.** [`/privacy`](src/app/(site)/privacy/page.tsx) is the чл. 13 notice, linked from the footer and from a notice line on both forms (`ContactForm`, `ContactMessageForm`; no consent checkbox, because the basis is the customer's own request). It names `CONTACTS.legalName` as the controller, or the brand while that's empty. Without `NEXT_PUBLIC_GOOGLE_ADS_ID` the public site sets no cookies, loads no third-party script (fonts are self-hosted by `next/font`, social links are plain links), and keeps only the basket in localStorage, which is strictly necessary, so there's no banner. With it set, [`CookieBanner`](src/components/CookieBanner.tsx) asks first and [`GoogleAdsTag`](src/components/GoogleAdsTag.tsx) loads only after a yes ([`consent.ts`](src/lib/consent.ts), key `consent.v1`). The footer's „Бисквитки“ link withdraws it. Both sit in the `(site)` layout, so `/admin` has neither. **Any other analytics, pixel or embed goes behind that same banner, plus an update to `/privacy`.** Requests forget who sent them 12 months after the event: `forget_old_requests()` ([`migration-retention.sql`](migration-retention.sql), nightly via pg_cron) nulls name, phone, note and `custom_text`, and the page promises exactly that, so change both together.

**SEO: the address is `SITE_URL`, the homepage is cached.** [`src/lib/site.ts`](src/lib/site.ts) holds `https://ukrasivarna.com`; the root layout's `metadataBase` turns every page's relative `alternates.canonical` into a full URL. [`robots.ts`](src/app/robots.ts) keeps `/admin` out (and a whole Netlify preview, via `CONTEXT`); [`sitemap.ts`](src/app/sitemap.ts) lists the pages plus every category and every gallery tag that has photos, read from the DB. A category is its own page: `CatalogView` writes `/catalog/arches` (not `?cat=`) when exactly one is picked ([`catalogHref()`](src/lib/catalog-plp.ts)), and the mobile pills are real `<a href>` links. Its text under the heading and meta description is `categories.description` (the column the configurator already used as its hint line), edited per row in `/admin/categories`; empty falls back to the general line. Each gallery tag gets its own title, H1 and canonical. [`opengraph-image.tsx`](src/app/opengraph-image.tsx) draws the share picture at build time with the TTF in `src/app/fonts/` (the renderer has no Cyrillic and can't read next/font's files); [`LocalBusinessJsonLd`](src/components/LocalBusinessJsonLd.tsx) is in the site layout — never add a rating to it without real reviews on the site. The homepage reads through [`createPublicClient()`](src/lib/supabase/public.ts), which never touches cookies, so it is ISR (`revalidate = 300`) and admin writes refresh it via `revalidatePath`; reading the session client there would make it per-request again.

## Current state & where to look

[`docs/PROGRESS.md`](docs/PROGRESS.md) is the live checklist — read it before picking up work. In short:

- **Steps 1–2 are done**: scaffold, tokens, Supabase clients, public shell, and the configurator (built from `getCatalog()`, submits to `bookings`/`booking_items`). It was the homepage until v2; now it sits at the hidden `/configurator`.
- **Step 0 (Supabase project, `schema.sql` + `seed.sql`, the `catalog` Storage bucket, admin users) is done** — the live database has been in use since 19 Sep 2026. **Never run `seed.sql` or `schema.sql` on it again:** both are for a brand-new project only, and the live database gets its changes as `migration-*.sql` files.
- **Step 3 is done without the PDP**: `/catalog` + `/catalog/[category]`, the basket and `/request`. There is deliberately no `/product/[slug]` for now (owner's call, 24 Sep 2026).
- **Step 4 is half done**: admin login and the guard on `/admin/*` work, and every request is emailed to the owner. `/admin/requests` (list, confirm, final price) is not built; `/admin` redirects to `/admin/products`.
- **Step 5 (calendar + availability view) is not started.** The SQL side (`reserved_qty`) exists; nothing in the admin shows it yet.
- **Step 6 is done**: product/category/colour CRUD, the photo library, `/admin/home`, `/admin/showcases`, `/admin/gallery`, SEO, and the deploy to Netlify at ukrasivarna.com.

## Follow-up actions — end every task with the table

A task here is not finished when the code compiles. Anything the **owner** has to do by hand
afterwards goes at the very end of the task's final message, as **one table**, even for a single row:

| # | Action | Where / file | Why |
|---|---|---|---|
| 1 | Run in the Supabase SQL editor | [migration-foo.sql](migration-foo.sql) | adds `products.foo`, the catalog read needs it |
| 2 | Add env var `RESEND_API_KEY` | Netlify → Site settings → Environment | without it no request email goes out |
| 3 | Upload 3 photos | [/admin/showcases](src/app/admin/showcases/page.tsx) | the homepage falls back to the occasion cards until then |

Rules:

- **Every file in the table is a markdown link**, path relative to the repo root — `[migration-foo.sql](migration-foo.sql)`, `[src/lib/catalog.ts:42](src/lib/catalog.ts:42)` — so the owner opens a file preview with one click instead of hunting for it in the folder. Name an admin page by its file when you already have the path in hand; when you don't, the plain route (`/admin/showcases`) in the "Where" cell is fine — don't spend a file read hunting for it. A step with no file (Netlify, Supabase dashboard, DNS) keeps the "Where" cell plain text.
- One row per action, **in the order they must be done**; "Why" is one short phrase, not a paragraph.
- It covers everything a human must do: SQL to run on the live DB, env vars, a Storage bucket or RLS policy, data entered through the admin, `git` steps the agents may not take (merge into `main`, tag, cut a release branch), a Netlify setting, and anything no spec covers that he should click through himself.
- An env var is the **name** only — `RESEND_API_KEY`, never its value. No secret, key or token goes in the table, in a PR body or in a comment.
- For data entered through the admin, describe what to enter ("3 showcase photos, one per card"). Never paste live DB rows or customer data into the table.
- **Nothing to do by hand → one line: `No manual steps.`** Never print an empty table.
- The table is the last thing in the message, under a `### Follow-up actions` heading. Don't scatter the same steps through the prose above it as well — mention them once, there.
- `developer` reports its manual steps back to the Lead as a `Follow-up actions:` list, one line each; the Lead turns them into the one table the owner sees. The other sub-agents (`qa`, the reviewers) have a fixed reply shape and report nothing extra.

## Companion docs

- [`docs/PROGRESS.md`](docs/PROGRESS.md) — the running checklist; keep it in sync as you complete work.
- [`GETTING-STARTED.md`](GETTING-STARTED.md) — cold-start setup (Supabase, env vars, deploy) and the intended file tree.
- [`schema.sql`](schema.sql) / [`seed.sql`](seed.sql) — DB schema (+ RLS + `reserved_qty`) and the starter catalog, for a **brand-new** Supabase project only (SQL editor). `seed.sql` refuses to run on a database that already has products; the live database gets its changes from `migration-*.sql`.
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
