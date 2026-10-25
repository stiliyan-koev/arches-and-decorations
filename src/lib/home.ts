// Homepage content that isn't catalog data: the hero photos and the
// "by occasion" cards. The hero photos are managed in /admin/home (see
// getHeroPhotos in hero-photos.ts); the list below is only the placeholder
// shown until she adds some. `src: null` renders a pastel placeholder tile.

// Longest hero caption. Long enough for "Кръщене · небесно синьо", short
// enough to stay one pill. Lives here, not in hero-photos.ts, because the
// admin form (a client component) needs it too.
export const CAPTION_MAX = 60;

// Showcases („Украси“, see showcases.ts): the limits the admin forms show and
// the server actions check, and how many cards the homepage needs. Here for
// the same reason as CAPTION_MAX.
export const SHOWCASE_TITLE_MAX = 80;
export const SHOWCASE_BODY_MAX = 1500;
export const SHOWCASE_MAX_PHOTOS = 12;
export const HOME_SHOWCASE_COUNT = 3;

// A showcase's text is plain: a blank line starts a new paragraph. Shared by
// the homepage popup and the showcase's own page.
export function showcaseParagraphs(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((text) => text.trim())
    .filter(Boolean);
}

export type HeroPhoto = {
  id: string;
  src: string | null; // full image URL, or null for a placeholder tile
  alt: string;
  caption: string; // '' = no caption pill
};

export const HERO_PLACEHOLDERS: HeroPhoto[] = [
  { id: "placeholder-1", src: null, alt: "", caption: "Рожден ден · розово и злато" },
  { id: "placeholder-2", src: null, alt: "", caption: "Кръщене · небесно синьо" },
  { id: "placeholder-3", src: null, alt: "", caption: "Парти · корал и злато" },
  { id: "placeholder-4", src: null, alt: "", caption: "Първи рожден ден" },
  { id: "placeholder-5", src: null, alt: "", caption: "Моминско парти" },
  { id: "placeholder-6", src: null, alt: "", caption: "Кръщене · пудра" },
];

export type Occasion = {
  title: string;
  text: string;
  slug: string; // goes into /gallery?tag=<slug>; filters once a gallery tag has this slug
  src: string | null;
};

export const OCCASIONS: Occasion[] = [
  {
    title: "Рожден ден",
    text: "Арки, цифри и балонени фигури — от първия рожден ден до осемнайсетия.",
    slug: "rozhden-den",
    src: null,
  },
  {
    title: "Кръщене",
    text: "Нежни пастелни декори в бяло, синьо и пудра за най-светлия ден.",
    slug: "krashtene",
    src: null,
  },
  {
    title: "Парти",
    text: "Ярки балони за моминско парти, годишнина или просто хубав повод.",
    slug: "parti",
    src: null,
  },
];

// Placeholder tile colours, picked in turn by index.
export const PLACEHOLDER_COLORS = [
  "bg-balloon-pink/50",
  "bg-balloon-blue/50",
  "bg-balloon-orange/50",
  "bg-balloon-yellow/50",
];
