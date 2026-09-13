# Progress tracker

Tick the boxes as we go. Order follows the build order in `CLAUDE.md` — steps 4–6 don't
start until 1–3 are real and visible.

Legend: `[x]` done · `[ ]` not started · **(you)** = your job, not Claude's.

---

## Step 0 — Supabase setup **(you)** — BLOCKING

Nothing below this line is really finished until these are done. Right now the site runs on
`src/lib/catalog-fallback.ts`, a temporary copy of the seed data.

- [ ] Create the Supabase project (region: EU / Frankfurt)
- [ ] SQL editor → run `schema.sql`
- [ ] SQL editor → run `seed.sql`
- [ ] Storage → create bucket `catalog`, set it **public (read)**
- [ ] Authentication → Users → add your admin user (invite-only, no public sign-up)
- [ ] Authentication → Users → add your wife's admin user
- [ ] Fill the two keys in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- [ ] Then: delete `src/lib/catalog-fallback.ts` and re-test the homepage + request submit

---

## Step 1 — Scaffold, tokens, Supabase clients, public shell ✅

- [x] `create-next-app` (TS, Tailwind v4, App Router, ESLint, `src/`, `@/*`)
- [x] `@supabase/supabase-js` + `@supabase/ssr` installed
- [x] Design tokens in `globals.css` (mockup palette, not the original DESIGN.md one)
- [x] Fonts via `next/font` with `subsets: ["latin","cyrillic"]` (Unbounded + Nunito)
- [x] Browser + server Supabase clients in `src/lib/supabase/`
- [x] `.env.local.example` committed, `.env.local` ignored
- [x] Public layout: header nav (Начало, Каталог, Галерия, За нас) + contact footer
- [x] `/about` page
- [x] Placeholder pages so no nav link 404s

## Step 2 — Homepage from the mockup ✅

- [x] Configurator as the hero: item cards, variant select, colour swatches, custom-text field
- [x] Live "Ориентировъчна цена" card with line items
- [x] Event fields: град, дата, час, телефон, 2h-setup checkbox
- [x] Category strip + gallery teaser + footer
- [x] Built from the DB (`getCatalog()`), not a hardcoded list
- [x] Submit writes `bookings` (status `requested`) + `booking_items`, then a thank-you
- [x] "ориентировъчна цена / final price at a personal meeting" disclaimer
- [ ] **Verify the DB write end-to-end** — blocked on Step 0, never run against real Postgres

## Step 3 — Catalog (PLP + PDP)

- [ ] `/catalog` — all categories with their products
- [ ] `/catalog/[category]` — filtered list
- [ ] `/product/[slug]` — PDP
- [ ] Colour swatches that swap the photo (per `catalog-and-images.md`)
- [ ] Image carousel when a product has more than one photo
- [ ] Real photos uploaded to the `catalog` bucket + `product_images` rows
- [ ] `/configurator` as its own page (today it lives only on the homepage)

## Step 4 — Admin: login + requests inbox

- [ ] `/admin/login` — Supabase Auth (email + password)
- [ ] Auth guard on `/admin/*` — logged out goes to login
- [ ] `/admin/requests` — incoming requests list
- [ ] Open a request: see items, colours, date, phone
- [ ] Confirm a request + set the final price
- [ ] Owner gets notified of a new request (email or Supabase)

## Step 5 — Admin: calendar + availability

- [ ] `/admin` dashboard with a month calendar of confirmed bookings
- [ ] Per-item availability (quantity minus what's booked on that date)
- [ ] Green/red at-a-glance colours

## Step 6 — Admin CRUD, gallery, deploy

- [ ] `/admin/products` — add/edit/hide products and categories
- [ ] Edit prices without touching Supabase
- [ ] Upload product photos from the admin (straight to Storage)
- [ ] Manage colours/swatches per product
- [ ] `/gallery` — real past work, grouped by theme
- [ ] SEO meta + Open Graph (link previews for Instagram/Facebook)
- [ ] Responsive pass on a real phone
- [ ] Push to GitHub → import to Vercel → add the two env vars → deploy
- [ ] Point the domain at Vercel

---

## Housekeeping

- [ ] Replace the contact placeholders in `src/lib/contacts.ts` (phone, email, socials)
- [ ] Replace the placeholder prices in `seed.sql` with real ones
- [ ] Upgrade Node 20.9 → 22 LTS (Supabase wants 22; works today but warns)
- [ ] First real git commit (only the scaffold commit exists)

## Out of scope for v1

Payments / Stripe · online booking commitments · customer accounts · blog · English version.
