"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CropRect } from "@/lib/resize-image";
import { CAPTION_MAX } from "@/lib/home";
import { MAX_BULK, TAG_NAME_MAX } from "@/lib/gallery";
import type { GalleryTag } from "@/lib/gallery";
import { slugify } from "@/lib/slug";
import type { PhotoRef } from "@/lib/photo-library";

// Every write here runs through the logged-in user's cookies, so RLS sees
// `authenticated` and the "admin all …" policies in schema.sql apply. There is
// no service key anywhere in this app.

const BUCKET = "catalog";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Photo paths come from the browser, so only accept ones inside the product
// photos folder.
function isProductPhotoPath(path: string) {
  return path.startsWith("products/") && !path.includes("..");
}

// The crop is stored as-is in a jsonb column, so keep only the four numbers
// it should have. False = not a usable crop. x/y may be negative: a "whole
// photo" frame reaches past the photo's edges.
function cleanCrop(crop: CropRect | null | undefined): CropRect | null | false {
  if (crop == null) return null;
  const { x, y, width, height } = crop;
  const numbers = [x, y, width, height];
  if (!numbers.every((n) => typeof n === "number" && Number.isFinite(n))) {
    return false;
  }
  if (width <= 0 || height <= 0) return false;
  return { x, y, width, height };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Ids from the browser: only well-formed ones, each once.
function cleanIds(ids: string[]) {
  return [...new Set(ids)].filter((id) => typeof id === "string" && UUID.test(id));
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Postgres "unique violation": e.g. the photo is already in the carousel.
const UNIQUE_VIOLATION = "23505";

// ---------- Photo library: shared rules ----------
//
// Every original photo is one row in `photos` (the library). The carousel, the
// gallery and the products each use a library photo through their own row,
// with their own tile: a 4:5 crop in their own folder, or the original itself
// when she saved it "Без изрязване".

// New originals, named the way the upload helper names them.
function isLibraryPhotoPath(path: string) {
  return /^photos\/[0-9a-f-]{36}\.webp$/.test(path);
}

// A one-to-one embed comes back as an object, a one-to-many one as a list.
function asList<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

// The library photo a place wants to use. Null when the id is not a photo.
async function getLibraryPhoto(supabase: Supabase, id: string) {
  if (!UUID.test(id)) return null;
  const { data } = await supabase
    .from("photos")
    .select("id, path")
    .eq("id", id)
    .maybeSingle();
  return data as { id: string; path: string } | null;
}

// A tile path from the browser is accepted if it sits in that place's own
// folder, or if it is the library photo itself ("Без изрязване").
function tileAllowed(path: string, photo: { path: string }, inFolder: (path: string) => boolean) {
  return path === photo.path || inFolder(path);
}

// Removes tile files whose rows are gone or moved on — but never a file that
// is a library photo: a tile saved "Без изрязване" IS the original, and
// deleting it would lose the photo everywhere it is used. Best effort: the rows
// are what the site reads, so a stranded file is untidy rather than broken.
async function removeTiles(supabase: Supabase, paths: string[]) {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return;
  const { data: originals, error } = await supabase
    .from("photos")
    .select("path")
    .in("path", unique);
  if (error) return; // can't tell which are originals, so keep them all
  const keep = new Set(originals.map((photo) => photo.path));
  const files = unique.filter((path) => !keep.has(path));
  if (files.length) await supabase.storage.from(BUCKET).remove(files);
}

// Points one place's row at a new tile after a re-crop (always a new file
// name: the old URL is cached) and removes the old tile. The tile may only be
// in that place's folder, or the row's own library photo.
async function replaceTile(
  table: "hero_photos" | "gallery_photos" | "product_images",
  inFolder: (path: string) => boolean,
  id: string,
  input: { path: string; crop: CropRect | null },
): Promise<ActionResult> {
  if (!UUID.test(id)) return { ok: false, error: "Снимката не е намерена." };
  const crop = cleanCrop(input.crop);
  if (crop === false) return { ok: false, error: "Невалидно изрязване." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from(table)
    .select("path, photo:photos(path)")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Снимката не е намерена." };
  const photo = asList(row.photo as unknown as { path: string } | null)[0];
  if (!photo) {
    return { ok: false, error: "Снимката я няма в библиотеката. Качете я отново." };
  }
  if (!tileAllowed(input.path, photo, inFolder)) {
    return { ok: false, error: "Невалиден път до снимката." };
  }

  const { data: updated, error } = await supabase
    .from(table)
    .update({ path: input.path, crop })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!updated || updated.length === 0) {
    return { ok: false, error: "Снимката не е намерена." };
  }

  if (row.path !== input.path) await removeTiles(supabase, [row.path]);

  revalidateCatalog();
  return { ok: true };
}

// Admin pages are server-rendered from the same tables the public site reads,
// so a write has to invalidate both.
function revalidateCatalog() {
  revalidatePath("/", "layout");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ---------- Categories ----------

export type CategoryInput = {
  id?: string;
  slug: string;
  name: string;
  sort: number;
};

export async function saveCategory(input: CategoryInput): Promise<ActionResult> {
  if (!input.name.trim() || !input.slug.trim()) {
    return { ok: false, error: "Име и slug са задължителни." };
  }

  const supabase = await createClient();
  const row = {
    slug: input.slug.trim(),
    name: input.name.trim(),
    sort: input.sort,
  };

  const { error } = input.id
    ? await supabase.from("categories").update(row).eq("id", input.id)
    : await supabase.from("categories").insert(row);

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Вече има категория с този slug." : error.message,
    };
  }

  revalidateCatalog();
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateCatalog();
  return { ok: true };
}

// ---------- Products ----------

export type ProductInput = {
  id?: string;
  category_id: string | null;
  slug: string;
  name: string;
  description: string;
  base_price: number | null;
  pricing_type: "fixed" | "custom_quote";
  quantity: number;
  track_availability: boolean;
  rentable: boolean;
  service_only: boolean;
  active: boolean;
  sort: number;
};

export async function saveProduct(
  input: ProductInput,
): Promise<ActionResult & { id?: string }> {
  if (!input.name.trim() || !input.slug.trim()) {
    return { ok: false, error: "Име и slug са задължителни." };
  }
  if (input.pricing_type === "fixed" && input.base_price == null) {
    return { ok: false, error: "Въведете цена или изберете „По запитване“." };
  }

  const supabase = await createClient();
  const row = {
    category_id: input.category_id,
    slug: input.slug.trim(),
    name: input.name.trim(),
    description: input.description.trim() || null,
    // A quote-only product has no number to show, whatever is typed in the box.
    base_price: input.pricing_type === "custom_quote" ? null : input.base_price,
    pricing_type: input.pricing_type,
    quantity: input.quantity,
    track_availability: input.track_availability,
    rentable: input.rentable,
    service_only: input.service_only,
    active: input.active,
    sort: input.sort,
  };

  if (input.id) {
    const { error } = await supabase
      .from("products")
      .update(row)
      .eq("id", input.id);
    if (error) {
      return {
        ok: false,
        error: error.code === "23505" ? "Вече има продукт с този slug." : error.message,
      };
    }

    revalidateCatalog();
    return { ok: true, id: input.id };
  }

  // A new product needs its id back so the page can redirect to the editor,
  // where photos and colours are added. Admins can SELECT, so this is safe —
  // unlike the public booking insert, which has to generate its own id.
  const { data, error } = await supabase
    .from("products")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Вече има продукт с този slug." : error.message,
    };
  }

  revalidateCatalog();
  return { ok: true, id: data.id };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Storage isn't touched by the cascade, so note the tiles first and remove
  // them once the rows are gone. The library photos stay in the library.
  const { data: images } = await supabase
    .from("product_images")
    .select("path")
    .eq("product_id", id);

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await removeTiles(supabase, (images ?? []).map((image) => image.path));

  revalidateCatalog();
  return { ok: true };
}

// The carousel switches save the moment she ticks them, like the photos do,
// so they live apart from the main product form and its Save button.
export async function saveCarouselSettings(
  productId: string,
  input: {
    carousel: boolean;
    carousel_in_configurator: boolean;
    carousel_in_catalog: boolean;
  },
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({
      carousel: input.carousel,
      carousel_in_configurator: input.carousel_in_configurator,
      carousel_in_catalog: input.carousel_in_catalog,
    })
    .eq("id", productId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Продуктът не е намерен." };
  }

  revalidateCatalog();
  return { ok: true };
}

// ---------- Colours ----------

export type ColorInput = {
  product_id: string;
  color_slug: string;
  color_name: string;
  hex: string | null;
};

export async function addColor(input: ColorInput): Promise<ActionResult> {
  if (!input.color_name.trim() || !input.color_slug.trim()) {
    return { ok: false, error: "Име и slug на цвета са задължителни." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("product_colors").insert({
    product_id: input.product_id,
    color_slug: input.color_slug.trim(),
    color_name: input.color_name.trim(),
    hex: input.hex,
  });

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Такъв цвят вече съществува." : error.message,
    };
  }

  revalidateCatalog();
  return { ok: true };
}

export async function deleteColor(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // product_images.color_id cascades, so the rows go — but again, not the
  // tiles. The library photos stay in the library.
  const { data: images } = await supabase
    .from("product_images")
    .select("path")
    .eq("color_id", id);

  const { error } = await supabase.from("product_colors").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await removeTiles(supabase, (images ?? []).map((image) => image.path));

  revalidateCatalog();
  return { ok: true };
}

// ---------- Photos ----------

// The files themselves are uploaded straight from the browser to Storage —
// they never pass through the server. This only records where they landed:
// `photo_id` is the library photo, `path` the tile (the library photo itself
// when she saved it without cropping).
export async function attachImage(input: {
  product_id: string;
  color_id: string | null;
  in_carousel: boolean;
  photo_id: string;
  path: string;
  crop: CropRect | null;
  sort: number;
}): Promise<ActionResult> {
  const crop = cleanCrop(input.crop);
  if (crop === false) return { ok: false, error: "Невалидно изрязване." };

  const supabase = await createClient();
  const photo = await getLibraryPhoto(supabase, input.photo_id);
  if (!photo) return { ok: false, error: "Снимката я няма в библиотеката." };
  if (!tileAllowed(input.path, photo, isProductPhotoPath)) {
    return { ok: false, error: "Невалиден път до снимката." };
  }

  const { error } = await supabase.from("product_images").insert({
    product_id: input.product_id,
    // Carousel photos belong to the product, never to one colour.
    color_id: input.in_carousel ? null : input.color_id,
    in_carousel: input.in_carousel,
    photo_id: photo.id,
    path: input.path,
    // A copy for code that still reads it, until the cleanup migration.
    full_path: photo.path,
    crop,
    sort: input.sort,
  });
  if (error) return { ok: false, error: error.message };

  revalidateCatalog();
  return { ok: true };
}

// A re-cropped photo gets a new tile under a new name (the old public URL is
// cached). Sending the library photo's own path with `crop = null` switches a
// photo back to uncropped.
export async function replaceImage(
  id: string,
  input: { path: string; crop: CropRect | null },
): Promise<ActionResult> {
  return replaceTile("product_images", isProductPhotoPath, id, input);
}

// Swaps two neighbouring photos: `first` is the one shown earlier, `second`
// the one right after it. Only these two rows of this product are touched,
// whatever ids the browser sends.
export async function swapImageOrder(
  productId: string,
  first: { id: string; sort: number },
  second: { id: string; sort: number },
): Promise<ActionResult> {
  // Photos can share a sort value (new uploads use the file number), so a
  // plain swap could change nothing. Give the two distinct values instead.
  const low = Math.min(first.sort, second.sort);
  const high = Math.max(low + 1, first.sort, second.sort);

  const supabase = await createClient();
  const results = await Promise.all([
    supabase
      .from("product_images")
      .update({ sort: low })
      .eq("id", second.id)
      .eq("product_id", productId)
      .select("id"),
    supabase
      .from("product_images")
      .update({ sort: high })
      .eq("id", first.id)
      .eq("product_id", productId)
      .select("id"),
  ]);
  for (const { data, error } of results) {
    if (error) return { ok: false, error: error.message };
    if (!data || data.length === 0) {
      return { ok: false, error: "Снимката не е намерена." };
    }
  }

  revalidateCatalog();
  return { ok: true };
}

// Takes the photo off this product. The library photo stays.
export async function deleteImage(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from("product_images")
    .delete()
    .eq("id", id)
    .select("path");
  if (error) return { ok: false, error: error.message };
  if (deleted.length === 0) return { ok: false, error: "Снимката не е намерена." };

  await removeTiles(supabase, deleted.map((image) => image.path));

  revalidateCatalog();
  return { ok: true };
}

// ---------- Homepage photos ----------

// Like product photos, the files are uploaded straight from the browser;
// these only record and edit the rows. A tile from the browser must sit in the
// homepage photo folder, named the way the admin form names it — or be the
// library photo itself.
function isHeroPhotoPath(path: string) {
  return /^home\/hero\/[0-9a-f-]{36}\.webp$/.test(path);
}

// Puts a library photo at the end of the carousel, with its own tile.
export async function addHeroPhoto(input: {
  photoId: string;
  path: string;
  crop: CropRect | null;
}): Promise<ActionResult> {
  const crop = cleanCrop(input.crop);
  if (crop === false) return { ok: false, error: "Невалидно изрязване." };

  const supabase = await createClient();
  const photo = await getLibraryPhoto(supabase, input.photoId);
  if (!photo) return { ok: false, error: "Снимката я няма в библиотеката." };
  if (!tileAllowed(input.path, photo, isHeroPhotoPath)) {
    return { ok: false, error: "Невалиден път до снимката." };
  }

  // New photos go to the end of the carousel.
  const { data: lastRow } = await supabase
    .from("hero_photos")
    .select("sort")
    .order("sort", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("hero_photos").insert({
    photo_id: photo.id,
    path: input.path,
    crop,
    caption: "",
    sort: (lastRow?.sort ?? 0) + 1,
  });
  if (error?.code === UNIQUE_VIOLATION) {
    return { ok: false, error: "Снимката вече е в карусела." };
  }
  if (error) return { ok: false, error: error.message };

  revalidateCatalog();
  return { ok: true };
}

// A new framing for a carousel photo, cut from its library photo.
export async function replaceHeroTile(
  id: string,
  input: { path: string; crop: CropRect | null },
): Promise<ActionResult> {
  return replaceTile("hero_photos", isHeroPhotoPath, id, input);
}

export async function saveHeroCaption(
  id: string,
  caption: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hero_photos")
    .update({ caption: caption.trim().slice(0, CAPTION_MAX) })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Снимката не е намерена." };
  }

  revalidateCatalog();
  return { ok: true };
}

// Swaps two neighbouring photos, the same way as swapImageOrder.
export async function swapHeroOrder(
  first: { id: string; sort: number },
  second: { id: string; sort: number },
): Promise<ActionResult> {
  const low = Math.min(first.sort, second.sort);
  const high = Math.max(low + 1, first.sort, second.sort);

  const supabase = await createClient();
  const results = await Promise.all([
    supabase.from("hero_photos").update({ sort: low }).eq("id", second.id).select("id"),
    supabase.from("hero_photos").update({ sort: high }).eq("id", first.id).select("id"),
  ]);
  for (const { data, error } of results) {
    if (error) return { ok: false, error: error.message };
    if (!data || data.length === 0) {
      return { ok: false, error: "Снимката не е намерена." };
    }
  }

  revalidateCatalog();
  return { ok: true };
}

// Takes the photo out of the carousel. The library photo stays.
export async function removeHeroPhoto(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from("hero_photos")
    .delete()
    .eq("id", id)
    .select("path");
  if (error) return { ok: false, error: error.message };
  if (deleted.length === 0) return { ok: false, error: "Снимката не е намерена." };

  await removeTiles(supabase, deleted.map((photo) => photo.path));

  revalidateCatalog();
  return { ok: true };
}

// ---------- Gallery ----------

// Same deal as the homepage photos: the browser uploads the files, these only
// record and edit the rows. Each gallery photo is a library photo plus its
// gallery tile, named the way the admin form names it.
function isGalleryTilePath(path: string) {
  return /^gallery\/[0-9a-f-]{36}\.webp$/.test(path);
}

// Puts a library photo in the gallery, with its own tile and the tags given.
// keepFiles: the row could not be taken out again after a failure, so it
// still points at the tile and the form must not remove it.
export async function addGalleryPhoto(input: {
  photoId: string;
  path: string;
  crop: CropRect | null;
  tagIds: string[];
}): Promise<ActionResult | { ok: false; error: string; keepFiles: true }> {
  const crop = cleanCrop(input.crop);
  if (crop === false) return { ok: false, error: "Невалидно изрязване." };

  const supabase = await createClient();
  const photo = await getLibraryPhoto(supabase, input.photoId);
  if (!photo) return { ok: false, error: "Снимката я няма в библиотеката." };
  if (!tileAllowed(input.path, photo, isGalleryTilePath)) {
    return { ok: false, error: "Невалиден път до снимката." };
  }

  // The id is made here so the tags can be linked without reading the row
  // back, the same way submitRequest makes its booking id.
  const id = crypto.randomUUID();
  const { error } = await supabase.from("gallery_photos").insert({
    id,
    photo_id: photo.id,
    path: input.path,
    // A copy for code that still reads it, until the cleanup migration.
    full_path: photo.path,
    crop,
  });
  if (error?.code === UNIQUE_VIOLATION) {
    return { ok: false, error: "Снимката вече е в галерията." };
  }
  if (error) return { ok: false, error: error.message };

  const tagIds = cleanIds(input.tagIds).slice(0, MAX_BULK);
  if (tagIds.length > 0) {
    const { error: tagError } = await supabase
      .from("gallery_photo_tags")
      .insert(tagIds.map((tag_id) => ({ photo_id: id, tag_id })));
    // Take the photo out again, so a failed add leaves nothing behind and
    // the form can remove its tile the same way as for any other failure.
    if (tagError) {
      const { error: rollbackError } = await supabase
        .from("gallery_photos")
        .delete()
        .eq("id", id);
      if (rollbackError) {
        revalidateCatalog();
        return {
          ok: false,
          error: `Снимката е добавена без етикети: ${tagError.message}`,
          keepFiles: true,
        };
      }
      return { ok: false, error: tagError.message };
    }
  }

  revalidateCatalog();
  return { ok: true };
}

// Photo ids from the browser. More than MAX_BULK is refused outright rather
// than cut, so an action never quietly skips some of the photos.
function cleanPhotoIds(photoIds: string[]) {
  const ids = cleanIds(photoIds);
  return ids.length > MAX_BULK ? null : ids;
}

const TOO_MANY = `Изберете най-много ${MAX_BULK} снимки наведнъж.`;

// Gives one tag to every photo in the list. Photos that already have it are
// left alone, so it is safe to run on a mixed selection.
export async function addTagToGalleryPhotos(
  photoIds: string[],
  tagId: string,
): Promise<ActionResult> {
  const ids = cleanPhotoIds(photoIds);
  if (!ids) return { ok: false, error: TOO_MANY };
  if (ids.length === 0 || !UUID.test(tagId)) {
    return { ok: false, error: "Няма избрани снимки." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("gallery_photo_tags")
    .upsert(
      ids.map((photo_id) => ({ photo_id, tag_id: tagId })),
      { onConflict: "photo_id,tag_id", ignoreDuplicates: true },
    );
  if (error) return { ok: false, error: error.message };

  revalidateCatalog();
  return { ok: true };
}

// Takes one tag off every photo in the list. The photos and the tag stay.
export async function removeTagFromGalleryPhotos(
  photoIds: string[],
  tagId: string,
): Promise<ActionResult> {
  const ids = cleanPhotoIds(photoIds);
  if (!ids) return { ok: false, error: TOO_MANY };
  if (ids.length === 0 || !UUID.test(tagId)) {
    return { ok: false, error: "Няма избрани снимки." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("gallery_photo_tags")
    .delete()
    .eq("tag_id", tagId)
    .in("photo_id", ids);
  if (error) return { ok: false, error: error.message };

  revalidateCatalog();
  return { ok: true };
}

// A new framing for a gallery photo, cut from its library photo.
export async function replaceGalleryTile(
  id: string,
  input: { path: string; crop: CropRect | null },
): Promise<ActionResult> {
  return replaceTile("gallery_photos", isGalleryTilePath, id, input);
}

// Takes the photos out of the gallery, with their tags (on delete cascade).
// The library photos stay. Used for one photo and for a selection alike.
export async function removeFromGallery(photoIds: string[]): Promise<ActionResult> {
  const ids = cleanPhotoIds(photoIds);
  if (!ids) return { ok: false, error: TOO_MANY };
  if (ids.length === 0) return { ok: false, error: "Няма избрани снимки." };

  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from("gallery_photos")
    .delete()
    .in("id", ids)
    .select("path");
  if (error) return { ok: false, error: error.message };
  if (deleted.length === 0) return { ok: false, error: "Снимките не са намерени." };

  await removeTiles(supabase, deleted.map((photo) => photo.path));

  revalidateCatalog();
  return { ok: true };
}

// The name she types, tidied, and its slug. Null when there is nothing usable.
function cleanTagName(name: string) {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, TAG_NAME_MAX);
  const slug = slugify(clean);
  return clean && slug ? { name: clean, slug } : null;
}

// Postgres "unique violation": a tag with this slug already exists.
const DUPLICATE_TAG = "23505";

// Returns the new tag, so the tag picker can put it on a photo straight away.
export async function createGalleryTag(
  name: string,
): Promise<{ ok: true; tag: GalleryTag } | { ok: false; error: string }> {
  const tag = cleanTagName(name);
  if (!tag) return { ok: false, error: "Напишете име на етикета." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_tags")
    .insert(tag)
    .select("id, name, slug")
    .single();
  if (error?.code === DUPLICATE_TAG) return { ok: false, error: "Вече има такъв етикет." };
  if (error) return { ok: false, error: error.message };

  revalidateCatalog();
  return { ok: true, tag: { ...data, count: 0 } };
}

// Renaming changes the slug too, so an old /gallery?tag=… link falls back to
// all photos rather than pointing at a name that no longer exists.
export async function renameGalleryTag(id: string, name: string): Promise<ActionResult> {
  if (!UUID.test(id)) return { ok: false, error: "Етикетът не е намерен." };
  const tag = cleanTagName(name);
  if (!tag) return { ok: false, error: "Напишете име на етикета." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_tags")
    .update(tag)
    .eq("id", id)
    .select("id");
  if (error?.code === DUPLICATE_TAG) return { ok: false, error: "Вече има такъв етикет." };
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "Етикетът не е намерен." };

  revalidateCatalog();
  return { ok: true };
}

// The photos stay; they only lose this tag (on delete cascade).
export async function deleteGalleryTag(id: string): Promise<ActionResult> {
  if (!UUID.test(id)) return { ok: false, error: "Етикетът не е намерен." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_tags")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "Етикетът не е намерен." };

  revalidateCatalog();
  return { ok: true };
}

// ---------- Photo library ----------

// Records an original the browser just uploaded to photos/. Returns the new
// library photo, so the form can go on and use it in a place straight away.
export async function addPhoto(
  path: string,
): Promise<{ ok: true; photo: PhotoRef } | { ok: false; error: string }> {
  if (!isLibraryPhotoPath(path)) {
    return { ok: false, error: "Невалиден път до снимката." };
  }

  // The id is made here so the row needn't be read back (see addGalleryPhoto).
  const id = crypto.randomUUID();
  const supabase = await createClient();
  const { error } = await supabase.from("photos").insert({ id, path });
  if (error) return { ok: false, error: error.message };

  revalidateCatalog();
  return { ok: true, photo: { id, path } };
}

// Deletes library photos for good: from every place that uses them (on delete
// cascade), with every file — the original and each place's tile. The paths
// come from the rows, never from the browser.
export async function deletePhotos(photoIds: string[]): Promise<ActionResult> {
  const ids = cleanPhotoIds(photoIds);
  if (!ids) return { ok: false, error: TOO_MANY };
  if (ids.length === 0) return { ok: false, error: "Няма избрани снимки." };

  const supabase = await createClient();
  const { data: photos, error: readError } = await supabase
    .from("photos")
    .select("id, path, hero_photos(path), gallery_photos(path), product_images(path)")
    .in("id", ids);
  if (readError) return { ok: false, error: readError.message };

  const { data: deleted, error } = await supabase
    .from("photos")
    .delete()
    .in("id", ids)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (deleted.length === 0) return { ok: false, error: "Снимките не са намерени." };

  // Only the photos that really went. Their originals are no longer library
  // photos now, so removeTiles lets them go too.
  const gone = new Set(deleted.map((photo) => photo.id));
  const files = photos
    .filter((photo) => gone.has(photo.id))
    .flatMap((photo) => [
      photo.path,
      ...asList(photo.hero_photos as unknown as { path: string } | null).map((row) => row.path),
      ...asList(photo.gallery_photos as unknown as { path: string } | null).map((row) => row.path),
      ...photo.product_images.map((row) => row.path),
    ]);
  await removeTiles(supabase, files);

  revalidateCatalog();
  return { ok: true };
}
