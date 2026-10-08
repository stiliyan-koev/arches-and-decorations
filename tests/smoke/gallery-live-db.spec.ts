import { test, expect } from "@playwright/test";

// getPublicGallery() swallows every database error and shows „Очаквайте скоро“,
// so a broken gallery looks exactly like an empty one. Read the newest photo
// from the database and check that /gallery contains its id (the first page is
// newest first).
//
// Read-only, over plain REST with the anon key, like catalog-live-db.spec.ts.
test("gallery shows photos from the database", { tag: "@critical" }, async ({ page, request }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL is missing in .env.local").toBeTruthy();
  expect(anonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local").toBeTruthy();

  const query = "select=id&order=created_at.desc,id.asc&limit=1";
  const dbResponse = await request.get(`${url}/rest/v1/gallery_photos?${query}`, {
    headers: { apikey: anonKey!, Authorization: `Bearer ${anonKey!}` },
  });
  expect(
    dbResponse.ok(),
    `The database returned ${dbResponse.status()}: ${await dbResponse.text()}`,
  ).toBe(true);
  const photos = (await dbResponse.json()) as { id: string }[];

  await page.goto("/gallery");
  await expect(page.getByRole("heading", { level: 1, name: "Галерия" })).toBeVisible();

  // No photos uploaded yet: the placeholder is the right thing to show.
  if (photos.length === 0) {
    await expect(page.getByText(/Очаквайте скоро/)).toBeVisible();
    test.info().annotations.push({
      type: "not checked",
      description: "The database has no gallery photos yet, so only the placeholder was checked.",
    });
    return;
  }

  const html = await page.content();
  expect(
    html.includes(photos[0].id),
    `/gallery does not contain the newest photo (${photos[0].id}). ` +
      "The gallery query is probably failing and the page fell back to „Очаквайте скоро“.",
  ).toBe(true);
  await expect(page.getByText(/Очаквайте скоро/)).toHaveCount(0);
});
