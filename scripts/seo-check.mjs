#!/usr/bin/env node
/**
 * seo-check — deterministic SEO regression gate for this project.
 *
 * Static analysis only: no network, no build, no database. Everything it
 * reports is checkable by reading files, so it never over-reports the way a
 * review agent can. Judgment calls (is this H1 good, is this copy thin) are
 * the seo-reviewer agent's job, not this script's.
 *
 *   node scripts/seo-check.mjs            # report, exit 1 only on BLOCK
 *   node scripts/seo-check.mjs --strict   # warnings block too
 *   node scripts/seo-check.mjs --json     # machine-readable
 *
 * Deliberately NOT checked here, because performance-reviewer already owns
 * them and the Lead would drop the duplicate: next/image `sizes`, `priority`
 * on the first image, "use client" placement, forced-dynamic rendering.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const APP = join(ROOT, "src", "app");
const SRC = join(ROOT, "src");

const STRICT = process.argv.includes("--strict");
const AS_JSON = process.argv.includes("--json");

/** Routes that are intentionally kept out of search. Not findings. */
const INTENTIONAL_NOINDEX = new Set(["/request", "/configurator"]);
/** Trees that are private and never get SEO checks at all. */
const PRIVATE_SEGMENTS = new Set(["admin", "api"]);

const findings = [];
const add = (sev, route, problem, fix) =>
  findings.push({ sev, route, problem, fix });

// ─── helpers ──────────────────────────────────────────────────────────────

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(p, out);
    } else out.push(p);
  }
  return out;
}

function read(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

/** src/app/(site)/catalog/[category]/page.tsx -> /catalog/[category] */
function routeOf(pageFile) {
  const rel = relative(APP, pageFile).split(sep);
  rel.pop(); // page.tsx
  const segs = rel.filter((s) => !(s.startsWith("(") && s.endsWith(")")));
  return "/" + segs.join("/");
}

const isPrivate = (pageFile) =>
  relative(APP, pageFile)
    .split(sep)
    .some((s) => PRIVATE_SEGMENTS.has(s));

const isDynamic = (route) => route.includes("[");

// ─── gather ───────────────────────────────────────────────────────────────

if (!existsSync(APP)) {
  // Not a Next app-router project. Nothing to check, and silence beats a
  // vacuous pass: a backend-only repo should not see SEO output at all.
  console.log("SEO-CHECK: SKIPPED\nreason: no src/app directory");
  process.exit(0);
}

const pageFiles = walk(APP).filter((p) => /[\\/]page\.tsx?$/.test(p));
const publicPages = pageFiles.filter((p) => !isPrivate(p));
const routes = publicPages.map((p) => ({
  route: routeOf(p),
  file: p,
  body: read(p),
}));

const rootLayout = read(join(APP, "layout.tsx"));
const sitemapSrc = read(join(APP, "sitemap.ts"));
const robotsSrc = read(join(APP, "robots.ts"));
const allSrc = walk(SRC).filter((p) => /\.(tsx?|jsx?)$/.test(p));
const srcBlob = allSrc.map(read).join("\n");

// ─── global invariants ────────────────────────────────────────────────────

if (!robotsSrc) {
  add("BLOCK", "-", "no src/app/robots.ts", "add it; without it crawlers get no directives");
}
if (!sitemapSrc) {
  add("BLOCK", "-", "no src/app/sitemap.ts", "add it; dynamic routes are undiscoverable without one");
}
if (!/metadataBase/.test(rootLayout)) {
  add(
    "BLOCK",
    "/",
    "metadataBase missing from src/app/layout.tsx",
    "set metadataBase: new URL(SITE_URL) — without it canonical and OG URLs resolve relative and break"
  );
}
if (!/openGraph/.test(rootLayout) && !existsSync(join(APP, "opengraph-image.tsx"))) {
  add("WARN", "/", "no root openGraph metadata and no opengraph-image", "shared links render with no preview card");
}
if (!/lang=/.test(rootLayout)) {
  add("WARN", "/", "no lang attribute on <html> in the root layout", 'set lang="bg"');
}
if (!/(LocalBusiness|Organization)/.test(srcBlob)) {
  add(
    "WARN",
    "-",
    "no LocalBusiness or Organization JSON-LD anywhere in src/",
    "add one block in the root layout; a local business with no entity markup is invisible as a business"
  );
}

// robots.ts: a blanket disallow is correct on a Netlify preview and wrong on
// production. Only flag an UNGUARDED one.
if (robotsSrc) {
  const blanket = /disallow:\s*["']\/["']/.test(robotsSrc);
  const guarded = /CONTEXT|isPreview|NODE_ENV|VERCEL_ENV|preview/i.test(robotsSrc);
  if (blanket && !guarded) {
    add(
      "BLOCK",
      "-",
      'robots.ts disallows "/" with no preview/production guard',
      "this deindexes the whole site; guard it on the deploy context"
    );
  }
}

// ─── sitemap coverage ─────────────────────────────────────────────────────
// The sitemap reads categories, gallery tags and showcase slugs from Supabase,
// so slugs cannot be resolved here. Two things ARE checkable: that every
// static route is listed, and that each dynamic route has a branch at all.

if (sitemapSrc) {
  for (const { route } of routes) {
    if (INTENTIONAL_NOINDEX.has(route)) continue;

    if (!isDynamic(route)) {
      const listed =
        sitemapSrc.includes(`"${route}"`) ||
        sitemapSrc.includes(`'${route}'`) ||
        (route === "/" && /["']\/["']/.test(sitemapSrc));
      if (!listed) {
        add(
          "BLOCK",
          route,
          "static route is not in sitemap.ts",
          `add "${route}" to the pages array`
        );
      }
    } else {
      // /catalog/[category] -> look for a template building /catalog/...
      const prefix = route.slice(0, route.indexOf("[")).replace(/\/$/, "");
      const hasBranch =
        sitemapSrc.includes(`${prefix}/$`) ||
        sitemapSrc.includes(`${prefix}/`) ||
        new RegExp(`${prefix.replace(/\//g, "\\/")}`).test(sitemapSrc);
      if (!hasBranch) {
        add(
          "BLOCK",
          route,
          "dynamic route has no branch in sitemap.ts",
          `map its slugs into the sitemap under ${prefix}/`
        );
      }
    }
  }
}

// ─── per-route checks ─────────────────────────────────────────────────────

const titles = new Map();

for (const { route, file, body } of routes) {
  const where = relative(ROOT, file);
  const intentional = INTENTIONAL_NOINDEX.has(route);

  const hasMetadata = /export\s+(const\s+metadata|async\s+function\s+generateMetadata|function\s+generateMetadata)/.test(body);
  if (!hasMetadata) {
    add("BLOCK", route, `no metadata export in ${where}`, "export const metadata, or generateMetadata for a dynamic route");
  }

  // noindex: fine on /request and /configurator, a regression anywhere else.
  const noindexed = /index:\s*false|["']noindex["']/.test(body);
  if (noindexed && !intentional) {
    add(
      "BLOCK",
      route,
      `noindex on a public route (${where})`,
      "remove it, or add the route to INTENTIONAL_NOINDEX in scripts/seo-check.mjs if that is deliberate"
    );
  }
  if (intentional && !noindexed) {
    add("WARN", route, "expected to be noindex but is not", "restore the noindex, or drop it from INTENTIONAL_NOINDEX");
  }

  if (!intentional && hasMetadata && !/alternates\s*:/.test(body) && !/canonical/.test(body)) {
    add("BLOCK", route, "no alternates.canonical", `add alternates: { canonical: "${route}" }`);
  }

  // Titles: an identical literal across two routes is usually an inheritance
  // bug. Skipped when the title is built per item (a template literal) or the
  // route is dynamic — there the only literal in the file is typically the
  // notFound fallback, and comparing it would be a false positive.
  const dynamicTitle = /title:\s*`/.test(body) || isDynamic(route);
  if (!dynamicTitle) {
    const t = body.match(/title:\s*["']([^"']+)["']/);
    if (t) {
      const key = t[1].trim();
      if (titles.has(key)) {
        add("WARN", route, `title identical to ${titles.get(key)}: "${key}"`, "give each route its own title");
      } else titles.set(key, route);
    }
  }

  // Exactly one h1 per route.
  const h1s = (body.match(/<h1[\s>]/g) || []).length;
  if (h1s > 1) add("WARN", route, `${h1s} <h1> elements`, "keep one h1 per page");

  // Repeated alt text on one page — the ukrasivarna failure mode.
  const alts = [...body.matchAll(/alt=["']([^"']+)["']/g)].map((m) => m[1]);
  const dupes = alts.filter((a, i) => alts.indexOf(a) !== i);
  if (dupes.length) {
    add(
      "WARN",
      route,
      `${dupes.length + 1} images share the alt "${dupes[0]}"`,
      "derive alt from each item's own caption or title"
    );
  }
}

// ─── orphan check ─────────────────────────────────────────────────────────
// A route that builds fine, renders fine, and has no inbound link is
// invisible. Every other check passes on it. This is the one that matters.

const hrefs = new Set();
for (const m of srcBlob.matchAll(/href=\{?["'`]([^"'`}\s]+)/g)) hrefs.add(m[1]);
for (const m of srcBlob.matchAll(/href=\{`([^`]+)`/g)) hrefs.add(m[1]);

for (const { route } of routes) {
  if (route === "/" || INTENTIONAL_NOINDEX.has(route)) continue;

  let linked = false;
  if (isDynamic(route)) {
    // A template literal link counts: /ukrasi/${slug} covers /ukrasi/[slug].
    const prefix = route.slice(0, route.indexOf("[")).replace(/\/$/, "");
    for (const h of hrefs) {
      if (h.startsWith(prefix + "/")) {
        linked = true;
        break;
      }
    }
  } else {
    linked = hrefs.has(route) || hrefs.has(route + "/");
  }

  if (!linked) {
    const inSitemap = sitemapSrc.includes(route.replace(/\/\[.*$/, ""));
    add(
      inSitemap ? "WARN" : "BLOCK",
      route,
      inSitemap
        ? "no inbound internal link (in the sitemap, so crawlable, but gets no internal link equity)"
        : "orphaned: no inbound internal link and not in the sitemap",
      "add a <Link> to it from a page that lists this kind of thing"
    );
  }
}

// ─── report ───────────────────────────────────────────────────────────────

const blocking = findings.filter((f) => f.sev === "BLOCK");
const warnings = findings.filter((f) => f.sev === "WARN");
const verdict = blocking.length ? "FAIL" : warnings.length ? (STRICT ? "FAIL" : "WARN") : "PASS";

if (AS_JSON) {
  console.log(JSON.stringify({ verdict, routes: routes.length, blocking, warnings }, null, 2));
} else {
  const order = { BLOCK: 0, WARN: 1 };
  for (const f of findings.sort((a, b) => order[a.sev] - order[b.sev])) {
    console.log(`[${f.sev}]${f.sev === "WARN" ? " " : ""} ${f.route} — ${f.problem}`);
    console.log(`        fix: ${f.fix}`);
  }
  if (!findings.length) console.log("No findings.");
  console.log("");
  console.log(`SEO-CHECK: ${verdict}`);
  console.log(`scope: ${routes.length} public route(s)`);
  console.log(`blocking: ${blocking.length}`);
  console.log(`warnings: ${warnings.length}`);
  console.log("");
  console.log(
    "unverified: response headers (X-Robots-Tag, cache-control), rendered HTML,"
  );
  console.log(
    "            field Core Web Vitals, and sitemap slugs that come from Supabase."
  );
  console.log("            Those need a deployed URL; this is a static check.");
}

process.exit(verdict === "FAIL" ? 1 : 0);
