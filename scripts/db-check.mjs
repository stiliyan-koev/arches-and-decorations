#!/usr/bin/env node
/**
 * db-check — has every migration-*.sql been run on the live database?
 *
 * Read-only. It asks Supabase's REST API, with the public anon key, whether
 * each migration's tables, columns and functions exist. `limit=0` means no
 * row ever comes back, and nothing is written. Run it before merging a
 * release into main:
 *
 *   npm run db-check      # reads .env.local, exit 1 if anything is missing
 *
 * A new migration-*.sql gets a row in CHECKS below. A file with no row makes
 * the script fail, so a migration can't be forgotten here either.
 */

import { readdirSync } from "node:fs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * One row per migration file. A probe is either
 *   { table, select }  — the table and these columns exist
 *   { rpc, args }      — the function exists and anon may call it
 * `manual` = nothing the anon key can see; the text says how to check by hand.
 */
const CHECKS = {
  "migration-admin-policies.sql": [{ rpc: "is_admin", args: {} }],
  "migration-configurator.sql": [
    {
      table: "categories",
      select:
        "in_configurator,description,add_label,picker,recommend_category_id,recommend_title,recommend_hint,recommend_label",
    },
    { table: "products", select: "option_group" },
    { rpc: "reserved_qty_all", args: { p_from: "1900-01-01", p_to: "1900-01-01" } },
  ],
  "migration-euro-and-balloon-theme.sql": {
    manual: "only comments and constraints; in the SQL editor: select conname from pg_constraint where conname = 'booking_items_custom_text_len';",
  },
  "migration-gallery.sql": [
    { table: "gallery_photos", select: "*" },
    { table: "gallery_tags", select: "*" },
    { table: "gallery_photo_tags", select: "*" },
  ],
  "migration-gallery-tag-description.sql": [{ table: "gallery_tags", select: "description" }],
  "migration-hero-photos.sql": [{ table: "hero_photos", select: "*" }],
  "migration-labour.sql": [{ table: "settings", select: "*" }],
  "migration-offer-mode.sql": [{ table: "products", select: "offer_mode,covers_needed" }],
  "migration-offer-mode-service-only.sql": {
    // Data only, no new column to probe: it corrects rows the offer_mode
    // back-fill already wrote from `rentable` alone.
    manual:
      "in the SQL editor: select count(*) from products where service_only = true and offer_mode <> 'setup';  -- expect 0",
  },
  "migration-photo-library.sql": [
    { table: "photos", select: "*" },
    { table: "product_images", select: "photo_id" },
    { table: "gallery_photos", select: "photo_id,crop" },
    { table: "hero_photos", select: "photo_id,crop" },
  ],
  "migration-photo-variants.sql": [{ table: "product_images", select: "full_path,crop" }],
  "migration-product-carousel.sql": [
    { table: "products", select: "carousel,carousel_in_configurator,carousel_in_catalog" },
    { table: "product_images", select: "in_carousel" },
  ],
  "migration-product-colors.sql": [
    { table: "products", select: "has_colors" },
    { table: "product_colors", select: "quantity" },
    { rpc: "reserved_qty_by_color", args: { p_from: "1900-01-01", p_to: "1900-01-01" } },
  ],
  "migration-rent-toggle.sql": [{ table: "settings", select: "rent_enabled" }],
  "migration-requirements.sql": [{ table: "products", select: "asks_requirements" }],
  "migration-retention.sql": {
    // Calling forget_old_requests() would run the wipe, and anon is (rightly)
    // not allowed to anyway, so this one stays a manual check.
    manual: "in the SQL editor: select jobname, schedule from cron.job where jobname = 'forget-old-requests';",
  },
  "migration-showcases.sql": [
    { table: "showcases", select: "*" },
    { table: "showcase_photos", select: "*" },
  ],
  "migration-showcase-slug.sql": [{ table: "showcases", select: "slug" }],
};

/** Returns null when the probe passes, or what's missing. */
async function runProbe(probe) {
  const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
  const res = probe.rpc
    ? await fetch(`${URL}/rest/v1/rpc/${probe.rpc}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(probe.args),
      })
    : await fetch(`${URL}/rest/v1/${probe.table}?select=${probe.select}&limit=0`, { headers });
  if (res.ok) return null;

  const body = await res.json().catch(() => ({}));
  const what = probe.rpc ? `function ${probe.rpc}()` : `${probe.table} (${probe.select})`;
  return `${what}: ${body.message ?? `HTTP ${res.status}`}`;
}

if (!URL || !KEY) {
  console.error("db-check: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set (.env.local).");
  process.exit(1);
}

const files = readdirSync(".").filter((f) => /^migration-.*\.sql$/.test(f)).sort();
let failed = 0;
let manual = 0;

for (const file of files) {
  const check = CHECKS[file];
  if (!check) {
    console.log(`✗ ${file} — no row in CHECKS in scripts/db-check.mjs; add one`);
    failed++;
    continue;
  }
  if (check.manual) {
    console.log(`? ${file} — can't see it from the API; ${check.manual}`);
    manual++;
    continue;
  }
  const problems = (await Promise.all(check.map(runProbe))).filter(Boolean);
  if (problems.length === 0) {
    console.log(`✓ ${file}`);
  } else {
    console.log(`✗ ${file}`);
    for (const p of problems) console.log(`    ${p}`);
    failed++;
  }
}

console.log(`\n${files.length - failed - manual} ran, ${failed} missing, ${manual} to check by hand.`);
process.exit(failed > 0 ? 1 : 0);
