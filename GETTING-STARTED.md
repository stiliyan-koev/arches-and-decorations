# Getting started — cold start to running app

Follow top to bottom. Assumes Node 20+, a Supabase account, a Netlify account, and Claude Code. All docs referenced here go at the repo root.

## 0. Scaffold
```bash
npx create-next-app@latest ukrasivarna --ts --tailwind --app --eslint --src-dir --import-alias "@/*"
cd ukrasivarna
npm i @supabase/supabase-js @supabase/ssr
```
Drop these at the repo root so Claude Code has full context:
`CLAUDE.md`, `schema.sql`, `seed.sql`, `catalog-and-images.md`, `DESIGN.md`, `GETTING-STARTED.md`.

## 1. Supabase project
1. Create a project in the Supabase dashboard (pick the EU region — Frankfurt — closest to Varna).
2. SQL editor → paste and run **`schema.sql`**, then **`seed.sql`**.
3. Storage → create a bucket named **`catalog`**, set it **public** (read).
4. Authentication → Users → add your admin user (email + password). Add your wife's later. No public sign-up — the admin is invite-only.

## 2. Env vars
Create `.env.local` (never commit it):
```
NEXT_PUBLIC_SUPABASE_URL=...        # Project settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # anon public key
```
The anon key is safe in the browser because RLS (in `schema.sql`) guards the tables. You do **not** need the service-role key for v1 — skip it.

## 3. Suggested file tree
```
src/
  app/
    (site)/                 # public, informational
      layout.tsx            # header/footer, BG chrome
      page.tsx              # home
      about/page.tsx
      gallery/page.tsx
      catalog/page.tsx
      catalog/[category]/page.tsx
      product/[slug]/page.tsx
      configurator/page.tsx
    admin/
      layout.tsx            # auth guard
      page.tsx              # dashboard + calendar
      login/page.tsx
      requests/page.tsx
      products/page.tsx
    globals.css             # design tokens from DESIGN.md
  components/               # Swatches, Carousel, ProductCard, ConfiguratorItem, Calendar...
  lib/
    supabase/
      client.ts             # browser client
      server.ts             # server client (RSC / actions)
    types.ts                # DB row types
```
Keep it flat. No `features/`, no `domain/`, no barrel-file mazes.

## 4. Build order (from CLAUDE.md — don't skip ahead)
1. Scaffold + Supabase wired + static home/about
2. Catalog (PLP + PDP with swatches + carousel)
3. Configurator → estimate → contact/meeting request
4. Admin auth + requests inbox
5. Admin calendar + availability
6. Admin CRUD + gallery + polish → deploy

## 5. First Claude Code prompts (paste these)

**Session 1 — foundation:**
> Read CLAUDE.md and DESIGN.md. Set up the two Supabase clients in `src/lib/supabase/` (browser + server, using @supabase/ssr) reading env vars. Put the design tokens from DESIGN.md into `globals.css` and wire the fonts with next/font (Cyrillic + Latin subsets). Build the public layout (header with nav: Начало, Каталог, Галерия, За нас; footer with contacts) and a home page with a hero and category grid. BG text, keep it simple.

**Session 2 — catalog:**
> Build the catalog. `/catalog` lists categories and products from Supabase; `/catalog/[category]` filters; `/product/[slug]` is the PDP with color swatches (from product_colors) that swap the image, and a carousel when a product has >1 image. Follow the swatch→image logic in catalog-and-images.md. Server Components for data, a small client component only for the swatch/carousel interaction.

**Session 3 — configurator:**
> Build `/configurator`: a checklist of products grouped by category, quantity inputs, and a free-text field for the custom figure. Show a live running total labeled "Ориентировъчна цена" that recalculates on every change. Signs (custom_quote) show "по запитване" and don't add to the number. Below it, a contact form (name, phone, city, event date OR pickup/return range, "може ли 2 часа преди събитието") that writes a `bookings` row with status 'requested' and its `booking_items`, then shows a thank-you. Make clear the final price is agreed at a personal meeting.

## 6. Deploy (when step 3 works)
Push to GitHub → Netlify: **Add new site → Import an existing project** → pick the repo. Netlify detects Next.js and runs it through its Next.js runtime (OpenNext) — no `netlify.toml` needed. Build settings:

| Field | Value |
|---|---|
| Base directory | *(empty — repo root)* |
| Build command | `npm run build` |
| Publish directory | `.next` |
| Functions directory | *(leave the default — the Next.js runtime generates the functions)* |

Add the two env vars under **Site configuration → Environment variables** *before* the first deploy: `NEXT_PUBLIC_*` values are baked in at build time, so adding them later needs a redeploy. Add your domain under **Domain management**.

## Definition of done for v1
A visitor in Varna can: see what's offered with photos, open a product and switch colors, build a selection and get an approximate price, and send a request. Your wife can: log in, see incoming requests, see a calendar of confirmed bookings, and add/edit products with images. No payments, no online booking commitment.
