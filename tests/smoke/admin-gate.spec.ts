import { test, expect } from "@playwright/test";

// src/proxy.ts sends anyone without a session from /admin/* to /admin/login.
// If that check breaks, the admin is open to the world, and nothing on the page
// would look wrong. So: ask for every admin page with no cookies and expect a
// redirect to the login page. Never logs in.
const ADMIN_PAGES = [
  "/admin",
  "/admin/products",
  "/admin/products/new",
  "/admin/categories",
  "/admin/gallery",
  "/admin/home",
];

test("admin pages send a visitor without a session to the login page", { tag: "@blocker" }, async ({ request }) => {
  for (const path of ADMIN_PAGES) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), `${path} answered ${response.status()} instead of a redirect`).toBeGreaterThanOrEqual(300);
    expect(response.status(), `${path} answered ${response.status()} instead of a redirect`).toBeLessThan(400);
    const location = new URL(response.headers()["location"] ?? "", "http://localhost");
    expect(location.pathname, `${path} redirects to the wrong place`).toBe("/admin/login");
  }
});

test("the admin login page renders", { tag: "@critical" }, async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { level: 1, name: "Вход в админ панела" })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});
