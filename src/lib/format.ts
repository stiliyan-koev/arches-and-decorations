// Prices are plain numbers in the database (BGN). One formatter so the tiles,
// the summary lines and the total all render digits the same way. Written by
// hand rather than with Intl so the server and the browser can't disagree
// during hydration.
export function formatPrice(value: number) {
  return `${value.toFixed(2).replace(".", ",")} лв`;
}

// Shown wherever a price can't be computed yet — custom_quote products and the
// setup/transport line.
export const QUOTE_LABEL = "по запитване";

// yyyy-mm-dd (what <input type="date"> gives us) -> dd.mm.yyyy for display.
export function formatDate(iso: string) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}
