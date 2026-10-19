import { test, expect, type Locator } from "@playwright/test";
import { formatPrice } from "../../src/lib/format";
import { priceIn } from "./add-item";

// The catalog is the main flow: „Добави“ on a card → the mini-basket slides in
// with the running total → „Продължи към запитването“ → /request. The basket
// lives in localStorage and crosses a full page load, which is exactly what a
// code review can't see working. Never presses „Изпрати запитване“ — the
// database is the live one.

// A catalog card that can still be added and shows a price, e.g. "60,00 €".
function pricedCards(cards: Locator) {
  return cards
    .filter({ has: cards.page().getByRole("button", { name: /^Добави „/ }) })
    .filter({ hasText: /\d,\d{2}\s€/ });
}

async function cardInfo(card: Locator) {
  const name = ((await card.locator("p").first().textContent()) ?? "").trim();
  const priceText = (await card.getByText(/^\d+,\d{2}\s€$/).textContent()) ?? "";
  return { name, price: priceIn(priceText.trim()) };
}

// „Труд за украса“: a label under the lines, added once to the sum when the
// basket goes as „Украса с монтаж“. 0 when the basket doesn't get it.
async function labourIn(drawer: Locator) {
  const label = drawer.getByText("Труд за украса", { exact: true });
  if ((await label.count()) === 0) return 0;
  const priceText = (await label.locator("..").getByText(/^\d+,\d{2}\s€$/).textContent()) ?? "";
  return priceIn(priceText.trim());
}

test("the basket adds up and carries over to the request page", { tag: "@critical" }, async ({ page }) => {
  await page.goto("/catalog");
  await page.evaluate(() => localStorage.removeItem("oferta.v1"));
  await page.reload();

  const cards = page.locator("article");
  const priced = pricedCards(cards);
  expect(await priced.count(), "Fewer than two priced products in the catalog").toBeGreaterThanOrEqual(2);

  const first = await cardInfo(priced.nth(0));
  const second = await cardInfo(priced.nth(1));

  // Adding opens the drawer, names the product and shows its price (plus the
  // labour, if it gets one) as the total.
  await priced.nth(0).getByRole("button").last().click();
  const drawer = page.getByRole("dialog", { name: "Вашата оферта" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText(`Добавено: „${first.name}“`)).toBeVisible();
  await expect(
    drawer.getByText(formatPrice(first.price + (await labourIn(drawer))), { exact: true }).last(),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();

  // The first card is now „Добавено“, so the second priced card is the old third
  // one — look it up by name instead.
  const secondCard = cards.filter({ hasText: second.name }).first();
  await secondCard.getByRole("button").last().click();
  await expect(drawer).toBeVisible();
  let lines = first.price + second.price;
  await expect(drawer.getByText(formatPrice(lines + (await labourIn(drawer))), { exact: true })).toBeVisible();

  // One more of the first product, if she owns more than one.
  const plus = drawer.getByRole("button", { name: `Увеличи броя на „${first.name}“` });
  if (await plus.isEnabled()) {
    await plus.click();
    lines += first.price;
    await expect(drawer.getByText(formatPrice(lines + (await labourIn(drawer))), { exact: true })).toBeVisible();
  }

  // Removing a line takes it off the total.
  await drawer.getByRole("button", { name: `Премахни „${second.name}“ от офертата` }).click();
  lines -= second.price;
  await expect(drawer.getByText(second.name)).toHaveCount(0);
  const expected = lines + (await labourIn(drawer));
  await expect(drawer.getByText(formatPrice(expected), { exact: true }).last()).toBeVisible();

  // Over to the order summary: same line, same total, send shut until it's filled in.
  await drawer.getByRole("link", { name: "Продължи към запитването →" }).click();
  await expect(page).toHaveURL(/\/request$/);
  await expect(page.getByRole("heading", { name: "Вашето запитване" })).toBeVisible();
  await expect(page.getByRole("button", { name: `Премахни „${first.name}“ от офертата` })).toBeVisible();
  // The rail's total; the mobile bar repeats it but is hidden at desktop width.
  await expect(page.getByText(formatPrice(expected), { exact: true }).filter({ visible: true }).last()).toBeVisible();
  await expect(page.getByRole("button", { name: "Изпрати запитване" })).toBeDisabled();
});
