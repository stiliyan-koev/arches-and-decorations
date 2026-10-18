// Prices are plain numbers in the database (EUR). One formatter so the tiles,
// the summary lines and the total all render digits the same way. Written by
// hand rather than with Intl so the server and the browser can't disagree
// during hydration. The space before "€" is non-breaking, so the sign never
// wraps onto a line of its own.
export function formatPrice(value: number) {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

// Shown wherever a price can't be computed yet — custom_quote products and the
// setup/transport line.
export const QUOTE_LABEL = "по запитване";

// Under the approximate total, in the mini-basket and on /request.
export const QUOTE_NOTE = "Цената на артикулите „по запитване“ ще уточним допълнително.";
export const PRICE_NOTE =
  "Посочената цена не включва труд за монтаж/демонтаж. Транспортът в рамките на гр. Варна е безплатен. За места извън Варна цената за транспорт се изчислява спрямо разстоянието.";

// The running estimate. When every line is „по запитване“ the sum is 0, and
// „0,00 €“ would read as free, so show „По запитване“ instead.
export function formatTotal(total: number, hasQuote: boolean) {
  return total === 0 && hasQuote ? "По запитване" : formatPrice(total);
}

// yyyy-mm-dd (what <input type="date"> gives us) -> dd.mm.yyyy for display.
export function formatDate(iso: string) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}
