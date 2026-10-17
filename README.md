# Хубавото балонче — празнични украси във Варна

A site for a Varna event-decoration business (balloon decorations, arches — birthdays, christenings, weddings). Two surfaces in one app:

- **Public site** — browse what's offered and get an *approximate* price from a configurator. No payments, no online booking; a request is a lead, and the final price and availability are settled at a personal meeting.
- **Admin** (not built yet) — an ops tool for the owner to manage products, images, and a booking calendar.

Built with **Next.js (App Router) + TypeScript + Tailwind v4** and **Supabase** (Postgres, Auth, Storage), deployed on **Netlify**.

## Quick start

```bash
npm install
cp .env.local.example .env.local   # then fill in the two Supabase keys
npm run dev                          # http://localhost:3000
```

The homepage renders from bundled seed data until Supabase is configured, so `npm run dev` works before the database exists. To go end-to-end (submitting a request), you need a Supabase project — see **[GETTING-STARTED.md](GETTING-STARTED.md)**.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (also type-checks) |
| `npm start` | Serve a production build |
| `npm run lint` | ESLint |

## Docs

- **[CLAUDE.md](CLAUDE.md)** — project brief, architecture, and conventions (start here).
- **[GETTING-STARTED.md](GETTING-STARTED.md)** — cold-start setup: Supabase, env vars, deploy.
- **[docs/PROGRESS.md](docs/PROGRESS.md)** — what's done and what's next.
- **[schema.sql](schema.sql)** / **[seed.sql](seed.sql)** — database schema and seed data.
- **[catalog-and-images.md](catalog-and-images.md)** — catalog structure and image conventions.
- **[DESIGN.md](DESIGN.md)** — original design/brand proposal.
