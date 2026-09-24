// Cyrillic -> latin, so she can type "Кръгла арка 180" and get a usable slug
// without inventing one. Product names are BG; slugs are data and stay ASCII
// (see the BG-UI / english-code rule in CLAUDE.md).
const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p",
  р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch",
  ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya",
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .split("")
    .map((character) => CYRILLIC[character] ?? character)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
