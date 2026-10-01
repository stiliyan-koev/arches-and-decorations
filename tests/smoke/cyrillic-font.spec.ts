import { test, expect } from "@playwright/test";

// next/font self-hosts every character set Google has for a font; `subsets`
// in layout.tsx only decides what gets preloaded. So Bulgarian text breaks in
// one quiet way: a brand font with no Cyrillic file. The browser then draws
// the Bulgarian text in the fallback font (Arial-like). No empty boxes,
// nothing looks broken, the site just stops looking like hers.
//
// For each brand font, this asks the browser to load the file that covers
// Cyrillic letters, and fails if there is none.

// The CSS variables set on <html> in src/app/layout.tsx.
const FONT_VARIABLES = ["--font-unbounded", "--font-nunito", "--font-playfair"];

test("Bulgarian text uses the brand fonts", { tag: "@critical" }, async ({ page }) => {
  await page.goto("/");

  for (const variable of FONT_VARIABLES) {
    const font = await page.evaluate(async (cssVariable) => {
      // e.g. "'Nunito', 'Nunito Fallback'". The first name is the real font.
      const value = getComputedStyle(document.documentElement).getPropertyValue(cssVariable);
      const family = value.split(",")[0].trim();
      if (!family) return { family, hasCyrillic: false };

      // The font files of this family that cover these letters, loaded.
      const faces = await document.fonts.load(`600 16px ${family}`, "Жж");
      return { family, hasCyrillic: faces.some((face) => face.status === "loaded") };
    }, variable);

    expect(font.family, `${variable} is not set on <html>`).not.toBe("");
    expect(
      font.hasCyrillic,
      `${font.family} (${variable}) has no Cyrillic font file: Bulgarian text falls back to Arial`,
    ).toBe(true);
  }
});
