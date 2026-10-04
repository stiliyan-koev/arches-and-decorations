// Gallery shapes and helpers that both the server reads (gallery-photos.ts)
// and the client components need. No database code here, so a client
// component can import it.

// How many photos one „Покажи още“ adds. Enough to fill a few screens, few
// enough that the first visit stays light.
export const GALLERY_PAGE_SIZE = 24;

// The most photos one page view lists (40 pages). Past that the URL is
// someone typing numbers, not someone scrolling.
const MAX_PAGES = 40;

// The longest tag name. Long enough for "Рожден ден · момиче", short
// enough to stay one chip.
export const TAG_NAME_MAX = 40;

// The most photos one bulk action (tag, untag, delete) takes. The admin grid
// lets her pick at most this many; the server refuses more.
export const MAX_BULK = 200;

export type GalleryTag = {
  id: string;
  name: string;
  slug: string;
  count: number; // photos with this tag
};

export type GalleryPhoto = {
  id: string;
  tileUrl: string; // the 4:5 tile, for grids
  fullUrl: string; // the whole photo, for the full-screen viewer
  tilePath: string; // storage paths, for the admin re-crop
  fullPath: string;
  tagIds: string[];
};

// The `?shown=` number from the URL, rounded up to whole pages: never below
// one page, never absurd.
export function shownFromParam(value: string | string[] | undefined) {
  const number = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isFinite(number) || number <= GALLERY_PAGE_SIZE) return GALLERY_PAGE_SIZE;
  const pages = Math.ceil(number / GALLERY_PAGE_SIZE);
  return Math.min(pages, MAX_PAGES) * GALLERY_PAGE_SIZE;
}

// Alt text for a photo: its tag names, e.g. "Украса: Рожден ден · Frozen".
export function photoAlt(photo: GalleryPhoto, tags: GalleryTag[]) {
  const names = tags.filter((tag) => photo.tagIds.includes(tag.id)).map((tag) => tag.name);
  return names.length ? `Украса: ${names.join(" · ")}` : "Реализирана украса";
}

// The public gallery URL for a tag. The filter lives in the URL, so a
// filtered gallery can be shared and the back button works.
export function galleryHref(tag: { slug: string } | null) {
  return tag ? `/gallery?tag=${tag.slug}` : "/gallery";
}
