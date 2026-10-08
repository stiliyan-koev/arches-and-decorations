import { test, expect } from "@playwright/test";
import { formatPrice } from "../../../src/lib/format";
import { addFirstOption, PRICED, priceIn } from "../../smoke/add-item";

// Most of her traffic comes from Instagram, on a phone. Below `lg` the summary
// rail drops underneath the tile grid, so the running total scrolls out of
// sight — MobileSummaryBar is what keeps the price and the next step pinned to
// the bottom of the screen. If it stops being pinned, a phone visitor builds a
// decoration and never sees what it costs or where to go next.
//
// This is a viewport, not a real phone: no touch, no device pixel ratio. It is
// enough to exercise Tailwind's `lg:hidden`, which is what decides the layout.
test.use({ viewport: { width: 390, height: 844 } });

// „Напред →“ is the mobile bar's button; the rail's says „Данни за контакт →“.
const BAR_CTA = "Напред →";

test("the summary bar stays on screen on a phone", { tag: "@minor" }, async ({ page }) => {
  await page.goto("/configurator");

  // Nothing chosen yet, so there is nothing to summarise.
  await expect(page.getByRole("button", { name: BAR_CTA })).toHaveCount(0);

  const item = await addFirstOption(page, PRICED);
  expect(item, "No family offers a priced option in a dropdown").not.toBeNull();
  const price = formatPrice(priceIn(item!));

  const barCta = page.getByRole("button", { name: BAR_CTA });
  await expect(barCta).toBeVisible();
  await expect(page.getByText(`1 детайл · ${price}`)).toBeVisible();
  // The same number the rail shows further down the page.
  await expect(page.locator('[aria-live="polite"]')).toHaveText(price);

  // Pinned, not merely present: still on screen at the bottom of the page.
  await expect(barCta).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(barCta).toBeInViewport();

  // On a desktop width the rail is beside the grid, so the bar must get out of the way.
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(barCta).toBeHidden();
});
