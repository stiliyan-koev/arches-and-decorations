import { test, expect } from "@playwright/test";
import { CONTACTS } from "../../src/lib/contacts";

// The „Свържете се с нас“ box on /about. The expected values come from
// src/lib/contacts.ts, the single place the header and footer read too.
test("about page shows the contacts", { tag: "@minor" }, async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1, name: "За нас" })).toBeVisible();

  const box = page.locator("aside");
  await expect(box.getByRole("heading", { name: "Свържете се с нас" })).toBeVisible();
  await expect(box.getByRole("link", { name: CONTACTS.email })).toHaveAttribute(
    "href",
    `mailto:${CONTACTS.email}`,
  );
  await expect(box.getByRole("link", { name: "Facebook" })).toHaveAttribute("href", CONTACTS.facebook);
  await expect(box.getByRole("link", { name: "TikTok" })).toHaveAttribute("href", CONTACTS.tiktok);
  await expect(box.getByText(CONTACTS.city, { exact: true })).toBeVisible();
});
