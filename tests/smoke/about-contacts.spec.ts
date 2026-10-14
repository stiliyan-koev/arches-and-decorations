import { test, expect } from "@playwright/test";
import { CONTACTS } from "../../src/lib/contacts";

// The „Свържете се с нас“ box on /about. The expected values come from
// src/lib/contacts.ts, the single place the header and footer read too.
// Messenger and Viber come first on purpose — they're the preferred channels.
test("about page shows the contacts", { tag: "@minor" }, async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1, name: "За нас" })).toBeVisible();

  const box = page.locator("aside");
  await expect(box.getByRole("heading", { name: "Свържете се с нас" })).toBeVisible();
  await expect(box.getByRole("link", { name: /Messenger/ })).toHaveAttribute(
    "href",
    CONTACTS.messengerHref,
  );
  await expect(box.getByRole("link", { name: /Viber/ })).toHaveAttribute(
    "href",
    CONTACTS.viberHref,
  );
  await expect(box.getByRole("link", { name: CONTACTS.phone })).toHaveAttribute(
    "href",
    CONTACTS.phoneHref,
  );
  await expect(box.getByRole("link", { name: "Facebook" })).toHaveAttribute("href", CONTACTS.facebook);
  await expect(box.getByRole("link", { name: "TikTok" })).toHaveAttribute("href", CONTACTS.tiktok);
  await expect(box.getByText(CONTACTS.city, { exact: true })).toBeVisible();
});

// The form replaces the email address we aren't publishing yet, so it has to
// be on the page and reachable without JavaScript-dependent setup.
test("about page has the contact form", { tag: "@minor" }, async ({ page }) => {
  await page.goto("/about");

  const form = page.locator("form").filter({ hasText: "Пишете ни" });
  await expect(form.getByLabel("Вашето име")).toBeVisible();
  await expect(form.getByLabel("Телефон")).toBeVisible();
  await expect(form.getByLabel("Съобщение")).toBeVisible();
  await expect(form.getByRole("button", { name: "Изпрати съобщение" })).toBeEnabled();
});

// Nothing on the public site advertises an email address yet.
test("no email address is published", { tag: "@minor" }, async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
});
