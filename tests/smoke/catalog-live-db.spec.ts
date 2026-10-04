import { test, expect } from "@playwright/test";

// getCatalog() quietly falls back to src/lib/catalog-fallback.ts when the
// database is missing or broken, and the fallback looks exactly like the real
// site. The difference is in the ids: the fallback uses slugs ("arch-cover"),
// the database uses UUIDs. So: read one real product id from the database and
// check that the catalog contains it. (Not the homepage: since v2 it shows no
// products.)
//
// Read-only, and over plain REST with the anon key — the same request the site
// makes. It deliberately does NOT use @supabase/supabase-js: that package needs
// a global WebSocket (Node 22+), which the site gets from Next's server but a
// Playwright worker does not.
test(
  "catalog shows products from the database, not the fallback",
  { tag: "@blocker" },
  async ({ request }) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(url, "NEXT_PUBLIC_SUPABASE_URL is missing in .env.local").toBeTruthy();
    expect(anonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local").toBeTruthy();

    // One active product that belongs to a category — the catalog only shows those.
    const query = "select=id,name&active=eq.true&category_id=not.is.null&limit=1";
    const dbResponse = await request.get(`${url}/rest/v1/products?${query}`, {
      headers: { apikey: anonKey!, Authorization: `Bearer ${anonKey!}` },
    });
    expect(
      dbResponse.ok(),
      `The database returned ${dbResponse.status()}: ${await dbResponse.text()}`,
    ).toBe(true);

    const products = (await dbResponse.json()) as { id: string; name: string }[];
    expect(products, "The database has no active products").toHaveLength(1);
    const product = products[0];

    const pageResponse = await request.get("/catalog");
    expect(pageResponse.ok(), `GET /catalog returned ${pageResponse.status()}`).toBe(true);
    const html = await pageResponse.text();

    expect(
      html.includes(product.id),
      `The catalog does not contain the id of „${product.name}“ (${product.id}). ` +
        "It is probably showing FALLBACK_GROUPS instead of the database.",
    ).toBe(true);
  },
);
