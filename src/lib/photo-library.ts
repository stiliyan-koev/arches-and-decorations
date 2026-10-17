import type { SupabaseClient } from "@supabase/supabase-js";
import { imageUrl } from "@/lib/images";
import { GALLERY_PAGE_SIZE } from "@/lib/gallery";

// The photo library (the `photos` table): shapes and the one query both the
// /admin/photos page (server) and the photo picker (browser) use. It takes the
// Supabase client as an argument, so this file stays importable from both.

// How many photos one „Покажи още“ adds. The same as the gallery's, so its
// `?shown=` helper (shownFromParam) fits the library too.
export const LIBRARY_PAGE_SIZE = GALLERY_PAGE_SIZE;

// Which photos to list. The "not-…" ones are for the picker: a photo can be in
// the carousel and in the gallery only once, so it hides those already there.
export type LibraryFilter =
  | "all"
  | "unused"
  | "carousel"
  | "gallery"
  | "products"
  | "showcases"
  | "not-carousel"
  | "not-gallery";

export const LIBRARY_FILTERS: { value: LibraryFilter; label: string }[] = [
  { value: "all", label: "Всички" },
  { value: "unused", label: "Неизползвани" },
  { value: "carousel", label: "В карусела" },
  { value: "gallery", label: "В галерията" },
  { value: "products", label: "В продукти" },
  { value: "showcases", label: "В украси" },
];

export type LibraryPhoto = {
  id: string;
  path: string; // the original, for re-framing and as the "Без изрязване" tile
  url: string;
  hasOriginal: boolean;
  heroId: string | null; // its row in the carousel, if it is in it
  gallery: { id: string; tagIds: string[] } | null; // its gallery row and tags
  products: { id: string; name: string }[]; // each product that uses it, once
  showcases: { id: string; title: string }[]; // each showcase it is in
};

// The bare photo the placement helpers need.
export type PhotoRef = { id: string; path: string };

type Row = {
  id: string;
  path: string;
  has_original: boolean;
  hero_photos: { id: string } | { id: string }[] | null;
  gallery_photos:
    | { id: string; gallery_photo_tags: { tag_id: string }[] }
    | { id: string; gallery_photo_tags: { tag_id: string }[] }[]
    | null;
  product_images: { product_id: string; products: { name: string } | null }[];
  showcase_photos: { showcase_id: string; showcases: { title: string } | null }[];
};

// A one-to-one embed (photo_id is unique in hero_photos and gallery_photos)
// comes back as an object; be ready for a list too.
function single<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function filterFromParam(value: string | string[] | undefined): LibraryFilter {
  const text = Array.isArray(value) ? value[0] : value;
  return LIBRARY_FILTERS.some((filter) => filter.value === text)
    ? (text as LibraryFilter)
    : "all";
}

// The newest `limit` photos that match, how many match in total, and whether
// there are more. Throws on a database error.
//
// Filters go through a second, aliased join (like getGalleryPhotos): `!inner`
// keeps photos that are used there, `is null` keeps photos that are not.
export async function queryLibrary(
  supabase: SupabaseClient,
  options: { filter: LibraryFilter; limit: number },
): Promise<{ photos: LibraryPhoto[]; total: number; hasMore: boolean }> {
  let columns = `id, path, has_original,
    hero_photos(id),
    gallery_photos(id, gallery_photo_tags(tag_id)),
    product_images(product_id, products(name)),
    showcase_photos(showcase_id, showcases(title))`;
  const notUsedIn: string[] = [];
  switch (options.filter) {
    case "carousel":
      columns += ", only:hero_photos!inner(id)";
      break;
    case "gallery":
      columns += ", only:gallery_photos!inner(id)";
      break;
    case "products":
      columns += ", only:product_images!inner(id)";
      break;
    case "showcases":
      columns += ", only:showcase_photos!inner(id)";
      break;
    case "unused":
      columns +=
        ", nh:hero_photos(id), ng:gallery_photos(id), np:product_images(id), ns:showcase_photos(id)";
      notUsedIn.push("nh", "ng", "np", "ns");
      break;
    case "not-carousel":
      columns += ", nh:hero_photos(id)";
      notUsedIn.push("nh");
      break;
    case "not-gallery":
      columns += ", ng:gallery_photos(id)";
      notUsedIn.push("ng");
      break;
  }

  let query = supabase
    .from("photos")
    .select(columns, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id")
    .range(0, options.limit - 1);
  for (const alias of notUsedIn) query = query.is(alias, null);

  const { data, count, error } = await query;
  if (error) throw error;

  const rows = data as unknown as Row[];
  return {
    photos: rows.map((row) => {
      const gallery = single(row.gallery_photos);
      // A product can use the same photo for several colours: list it once.
      const products = new Map<string, string>();
      for (const image of row.product_images) {
        products.set(image.product_id, image.products?.name ?? "Продукт");
      }
      return {
        id: row.id,
        path: row.path,
        url: imageUrl(row.path),
        hasOriginal: row.has_original,
        heroId: single(row.hero_photos)?.id ?? null,
        gallery: gallery
          ? { id: gallery.id, tagIds: gallery.gallery_photo_tags.map((link) => link.tag_id) }
          : null,
        products: [...products].map(([id, name]) => ({ id, name })),
        // A photo is in a showcase at most once, so no doubles here.
        showcases: row.showcase_photos.map((link) => ({
          id: link.showcase_id,
          title: link.showcases?.title ?? "Украса",
        })),
      };
    }),
    total: count ?? rows.length,
    hasMore: (count ?? 0) > rows.length,
  };
}

// Where a photo is used, in words, for the delete confirmation. Empty = unused.
export function usageText(photo: LibraryPhoto) {
  const places: string[] = [];
  if (photo.heroId) places.push("карусела");
  if (photo.gallery) places.push("галерията");
  for (const product of photo.products) places.push(`продукт „${product.name}“`);
  for (const showcase of photo.showcases) places.push(`украса „${showcase.title}“`);
  return places.join(", ");
}
