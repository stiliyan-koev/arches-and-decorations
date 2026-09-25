import type { Product, ProductImage } from "@/lib/types";

// Everything lives in one public Storage bucket — see catalog-and-images.md for
// the folder convention.
const BUCKET = "catalog";

// Every tile (catalog card, configurator, admin grid) shows photos at 4:5
// portrait. Square views show the middle of it.
export const TILE_ASPECT = 4 / 5;

// The page background (--color-bg in globals.css). Fills the gaps when a crop
// reaches past the photo's edges.
export const PAGE_BG = "#fff9f3";

// The whole photo, for anything "look closer". Rows from before we kept it
// only have the tile, so fall back to that.
export function fullImagePath(image: ProductImage) {
  return image.full_path ?? image.path;
}

// Public bucket, so the URL is predictable and needs no SDK call or signing.
export function imageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

// Which photo to show for a tile: the selected colour's first image, falling
// back to a colour-agnostic one. That fallback is what lets her upload a single
// photo of a product and have every swatch show something.
export function pickImage(
  images: ProductImage[] | undefined,
  colorId: string | null,
): ProductImage | null {
  if (!images?.length) return null;

  if (colorId) {
    const forColor = images.find((image) => image.color_id === colorId);
    if (forColor) return forColor;
  }

  return images.find((image) => image.color_id === null) ?? null;
}

// The photo the configurator shows for a selection — in the preview pane, the
// confirmed tile and the summary. When a recommended add-on colour is chosen it
// is the dominant visual (a cover recolours the whole arch), so its photo wins;
// otherwise the main product's own photo. Null falls back to a placeholder.
export function resolvePreviewImage(
  product: Product | null | undefined,
  addonProduct?: Product | null,
  addonColorId?: string | null,
): ProductImage | null {
  const addonPhoto =
    addonColorId && addonProduct
      ? pickImage(addonProduct.images, addonColorId)
      : null;
  if (addonPhoto) return addonPhoto;
  return product ? pickImage(product.images, null) : null;
}
