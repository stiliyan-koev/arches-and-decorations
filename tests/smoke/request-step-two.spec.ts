import { test, expect } from "@playwright/test";
import { formatDate, formatPrice } from "../../src/lib/format";
import { addFirstOption, futureDate, PRICED, priceIn } from "./add-item";

// Step 1 -> step 2. If this breaks, a customer can build a whole decoration and
// never reach the form that sends it: every lead is lost, and the site looks
// perfectly fine while it happens.
//
// It walks right up to the send button and stops. It never clicks it, and it
// clears the phone at the end so the form is left unsendable — submitting
// writes a real row into her bookings table.
test("step 1 leads to the contact form", { tag: "@blocker" }, async ({ page }) => {
  await page.goto("/");

  const item = await addFirstOption(page, PRICED);
  expect(item, "No family offers a priced option in a dropdown").not.toBeNull();
  const price = formatPrice(priceIn(item!));

  // A date is required before step 2, and it triggers the availability check.
  const date = futureDate(300);
  await page.locator("#event-date").fill(date);
  await expect(page.getByText("Проверяваме наличността…")).toBeHidden();

  await page.getByRole("button", { name: "Данни за контакт →" }).click();

  await expect(page.getByRole("heading", { name: "Как да се свържем с вас?" })).toBeVisible();
  // What step 1 collected, repeated back above the form.
  await expect(page.getByText(formatDate(date), { exact: false })).toBeVisible();
  await expect(page.getByText("Варна", { exact: false }).first()).toBeVisible();
  await expect(page.getByLabel("Вашето име")).toBeVisible();
  await expect(page.getByLabel("Телефон")).toBeVisible();
  await expect(page.getByLabel("Желани цветове, тема или допълнителни детайли")).toBeVisible();
  // The estimate survived the step change.
  await expect(page.locator('[aria-live="polite"]')).toHaveText(price);

  // The phone number is the one thing submitRequest refuses without, so the
  // send button is the gate: shut without it, open with it. Never clicked.
  const send = page.getByRole("button", { name: "Изпрати запитване" }).first();
  await expect(send).toBeDisabled();
  await page.getByLabel("Телефон").fill("0888123456");
  await expect(send).toBeEnabled();
  await page.getByLabel("Телефон").fill("");
  await expect(send).toBeDisabled();

  // Back to step 1 with the chosen item still there.
  await page.getByRole("button", { name: "← Към детайлите" }).click();
  await expect(page.getByRole("heading", { name: "Създайте своята украса" })).toBeVisible();
  await expect(page.locator('[aria-live="polite"]')).toHaveText(price);
});
