import type { CropRect } from "@/lib/resize-image";

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

// The longest tag text (shown on /gallery?tag=…, and Google's snippet).
// One or two sentences; Google cuts a description at about 155 characters
// anyway, the rest still shows on the page.
export const TAG_DESCRIPTION_MAX = 300;

// The most photos one bulk action (tag, untag, delete) takes. The admin grid
// lets her pick at most this many; the server refuses more.
export const MAX_BULK = 200;

export type GalleryTag = {
  id: string;
  name: string;
  slug: string;
  description: string; // under the heading on /gallery?tag=…; '' = the generic text
  count: number; // photos with this tag
};

export type GalleryPhoto = {
  id: string;
  photoId: string | null; // the library photo
  tileUrl: string; // the 4:5 tile, for grids
  fullUrl: string; // the whole photo, for the full-screen viewer
  tilePath: string; // storage paths, for the admin re-crop
  fullPath: string;
  crop: CropRect | null; // last framing, in the whole photo's pixels
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

// Alt text for a photo: what it shows plus its tag names, numbered by its
// place on the page, e.g. "Украса с балони: Рожден ден · Frozen, снимка 3".
// The number keeps two photos with the same tags from sharing one alt, which
// screen readers and image search both treat as the same picture.
export function photoAlt(photo: GalleryPhoto, tags: GalleryTag[], position: number) {
  const names = tags.filter((tag) => photo.tagIds.includes(tag.id)).map((tag) => tag.name);
  const what = names.length ? `Украса с балони: ${names.join(" · ")}` : "Украса с балони";
  return `${what}, снимка ${position}`;
}

// The public gallery URL for a tag. The filter lives in the URL, so a
// filtered gallery can be shared and the back button works.
export function galleryHref(tag: { slug: string } | null) {
  return tag ? `/gallery?tag=${tag.slug}` : "/gallery";
}
