import { test, expect } from "@playwright/test";

// getHomeShowcases() swallows every database error and the homepage then shows
// the occasion cards, so a broken showcase read looks exactly like "not three
// yet". Read the first three showcases that have a photo from the database and
// check the homepage shows the right section. With three, also open the first
// popup and close it again.
//
// Read-only, over plain REST with the anon key, like gallery-live-db.spec.ts.
test("homepage shows the showcases from the database", { tag: "@critical" }, async ({ page, request }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL is missing in .env.local").toBeTruthy();
  expect(anonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local").toBeTruthy();

  // `!inner` keeps only showcases with at least one photo, like the homepage.
  const query = "select=id,title,showcase_photos!inner(id)&order=sort.asc,id.asc&limit=3";
  const dbResponse = await request.get(`${url}/rest/v1/showcases?${query}`, {
    headers: { apikey: anonKey!, Authorization: `Bearer ${anonKey!}` },
  });
  expect(
    dbResponse.ok(),
    `The database returned ${dbResponse.status()}: ${await dbResponse.text()}`,
  ).toBe(true);
  const showcases = (await dbResponse.json()) as { id: string; title: string }[];

  await page.goto("/");

  // Fewer than three ready: the occasion cards are the right thing to show.
  if (showcases.length < 3) {
    await expect(page.getByRole("heading", { level: 2, name: "Вдъхнови се по повод" })).toBeVisible();
    test.info().annotations.push({
      type: "not checked",
      description: `Only ${showcases.length} showcase(s) with photos, so only the occasion cards were checked.`,
    });
    return;
  }

  await expect(page.getByRole("heading", { level: 2, name: "Наши украси отблизо" })).toBeVisible();

  const first = showcases[0];
  await page.getByRole("button", { name: first.title, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: first.title });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Затвори" }).click();
  await expect(dialog).toBeHidden();
});
