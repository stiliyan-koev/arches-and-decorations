// Shared by the specs that need something in the configurator before they can
// check anything. Not a spec file itself (Playwright only collects *.spec.ts).
import { expect, type Locator, type Page } from "@playwright/test";

// A dropdown option ending in a price, e.g. "Статив · 25,00 €".
export const PRICED = /\d,\d{2}\s€$/;
// A dropdown option for a custom_quote product, e.g. "Надпис за кръщене · по запитване".
export const QUOTE = /по запитване$/;

// Goes through the families' „+ Добави…“ buttons. In each modal it picks a
// „Вид“ (if the family has that step), looks for an enabled option whose label
// matches `pattern`, and confirms it. Families with a photo grid or a text box
// have no „Изберете вариант“ dropdown, so they are skipped.
// Returns the label it picked, or null if no family has a match.
export async function addFirstOption(page: Page, pattern: RegExp): Promise<string | null> {
  const addButtons = page.locator("#calc").getByRole("button", { name: /^\+/ });
  const familyCount = await addButtons.count();

  for (let i = 0; i < familyCount; i++) {
    await addButtons.nth(i).click();
    const modal = page.getByRole("dialog");
    const productSelect = modal.getByLabel("Изберете вариант", { exact: true });

    if ((await productSelect.count()) > 0) {
      const kindSelect = modal.getByLabel("Вид", { exact: true });
      // "" stands for "this family has no Вид step".
      const kinds = (await kindSelect.count()) > 0 ? await optionValues(kindSelect) : [""];

      for (const kind of kinds) {
        if (kind) await kindSelect.selectOption(kind);
        const match = productSelect.locator("option:not([disabled])").filter({ hasText: pattern });
        if ((await match.count()) > 0) {
          const label = ((await match.first().textContent()) ?? "").trim();
          await productSelect.selectOption({ label });
          await modal.getByRole("button", { name: "Потвърди избора" }).click();
          await expect(modal).toBeHidden();
          return label;
        }
      }
    }

    await modal.getByRole("button", { name: "Затвори" }).click();
    await expect(modal).toBeHidden();
  }
  return null;
}

// The values of a <select>'s real options (skips the "- изберете -" placeholder).
async function optionValues(select: Locator): Promise<string[]> {
  const values = await select.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  return values.filter((value) => value !== "");
}

// "Овална арка 180×80 см · 60,00 €" -> 60
export function priceIn(label: string): number {
  const match = label.match(/(\d+),(\d{2})\s€$/);
  return Number(`${match![1]}.${match![2]}`);
}

// yyyy-mm-dd, `days` from today. The date input refuses anything before today,
// and a date far out has nothing confirmed against it, so no tile is sold out.
export function futureDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
