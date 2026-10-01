import { test, expect } from "@playwright/test";
import { formatPrice, QUOTE_LABEL } from "../../src/lib/format";
import { addFirstOption, PRICED, QUOTE, priceIn } from "./add-item";

// The configurator's math: the total in the rail is the sum of the priced
// items, and a „по запитване“ item is shown as such and adds nothing.
//
// No product or price is hardcoded: the spec adds whatever the catalog offers,
// so it keeps working when she renames or re-prices things. It never presses
// „Изпрати запитване“, so nothing is written to the database.
test("configurator total adds up, quote items add nothing", { tag: "@critical" }, async ({ page }) => {
  await page.goto("/");

  // The big number under „Ориентировъчна сума“, the only polite live region.
  const total = page.locator('[aria-live="polite"]');
  await expect(total).toHaveText(formatPrice(0));

  const first = await addFirstOption(page, PRICED);
  expect(first, "No family offers a priced option in a dropdown").not.toBeNull();
  await expect(total).toHaveText(formatPrice(priceIn(first!)));

  const second = await addFirstOption(page, PRICED);
  expect(second, "Could not add a second priced option").not.toBeNull();
  const sum = priceIn(first!) + priceIn(second!);
  await expect(total).toHaveText(formatPrice(sum));

  const quote = await addFirstOption(page, QUOTE);
  if (quote === null) {
    test.info().annotations.push({
      type: "not checked",
      description: "The catalog has no „по запитване“ option, so the quote part was not checked.",
    });
    return;
  }
  // Its line in the rail says „по запитване“, and the total did not move.
  await expect(page.locator("#calc li").filter({ hasText: QUOTE_LABEL })).toHaveCount(1);
  await expect(total).toHaveText(formatPrice(sum));
});
