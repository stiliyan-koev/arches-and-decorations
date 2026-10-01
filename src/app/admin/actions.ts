"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CropRect } from "@/lib/resize-image";

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

// Every Storage file a set of photo rows uses: the tile and the whole photo,
// once each (a photo saved without cropping points both at the same file).
// Old rows have no full_path.
function photoFiles(rows: { path: string; full_path: string | null }[]) {
  const files = new Set<string>();
  for (const row of rows) {
    files.add(row.path);
    if (row.full_path) files.add(row.full_path);
  }
  return [...files];
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

  // Storage isn't touched by the cascade, so clear the files first. Losing a
  // row and orphaning its photos is worse than failing loudly here.
  const { data: images } = await supabase
    .from("product_images")
    .select("path, full_path")
    .eq("product_id", id);

  const files = photoFiles(images ?? []);
  if (files.length) await supabase.storage.from(BUCKET).remove(files);

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

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

  // product_images.color_id cascades, so the rows go — but again, not the files.
  const { data: images } = await supabase
    .from("product_images")
    .select("path, full_path")
    .eq("color_id", id);

  const files = photoFiles(images ?? []);
  if (files.length) await supabase.storage.from(BUCKET).remove(files);

  const { error } = await supabase.from("product_colors").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateCatalog();
  return { ok: true };
}

// ---------- Photos ----------

// The files themselves are uploaded straight from the browser to Storage —
// they never pass through the server. This only records where they landed:
// `path` is the tile, `full_path` the whole photo (the same file when she
// saved it without cropping).
export async function attachImage(input: {
  product_id: string;
  color_id: string | null;
  in_carousel: boolean;
  path: string;
  full_path: string;
  crop: CropRect | null;
  sort: number;
}): Promise<ActionResult> {
  if (!isProductPhotoPath(input.path) || !isProductPhotoPath(input.full_path)) {
    return { ok: false, error: "Невалиден път до снимката." };
  }
  const crop = cleanCrop(input.crop);
  if (crop === false) return { ok: false, error: "Невалидно изрязване." };

  const supabase = await createClient();
  const { error } = await supabase.from("product_images").insert({
    product_id: input.product_id,
    // Carousel photos belong to the product, never to one colour.
    color_id: input.in_carousel ? null : input.color_id,
    in_carousel: input.in_carousel,
    path: input.path,
    full_path: input.full_path,
    crop,
    sort: input.sort,
  });
  if (error) return { ok: false, error: error.message };

  revalidateCatalog();
  return { ok: true };
}

// A re-cropped photo gets a new tile under a new name (the old public URL is
// cached), so point the row at it and drop the old tile. Sending
// `path = full_path` with `crop = null` switches a photo back to uncropped.
export async function replaceImage(
  id: string,
  input: { path: string; crop: CropRect | null },
): Promise<ActionResult> {
  if (!isProductPhotoPath(input.path)) {
    return { ok: false, error: "Невалиден път до снимката." };
  }
  const crop = cleanCrop(input.crop);
  if (crop === false) return { ok: false, error: "Невалидно изрязване." };

  const supabase = await createClient();

  const { data: image } = await supabase
    .from("product_images")
    .select("path, full_path")
    .eq("id", id)
    .maybeSingle();

  // An unknown id (or one RLS hides) updates nothing and is not an error, so
  // check that a row actually changed before removing any file.
  const { data: updated, error } = await supabase
    .from("product_images")
    .update({ path: input.path, crop })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!updated || updated.length === 0) {
    return { ok: false, error: "Снимката не е намерена." };
  }

  // Best effort, as in deleteImage. Never remove the whole photo: a photo
  // saved without cropping has path = full_path, so its "old tile" IS the
  // original, and deleting it would lose the photo for good.
  if (image && image.path !== input.path && image.path !== image.full_path) {
    await supabase.storage.from(BUCKET).remove([image.path]);
  }

  revalidateCatalog();
  return { ok: true };
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

export async function deleteImage(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // The file paths come from the row, not from the browser, so this can only
  // ever remove the files that belong to this photo.
  const { data: image } = await supabase
    .from("product_images")
    .select("path, full_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("product_images").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Best effort: the row is what the site reads, so a stranded file is
  // untidy rather than broken.
  if (image) await supabase.storage.from(BUCKET).remove(photoFiles([image]));

  revalidateCatalog();
  return { ok: true };
}

// ---------- Homepage photos ----------

// Like product photos, the file is uploaded straight from the browser; these
// only record and edit the rows. Paths from the browser must sit in the
// homepage photo folder.
function isHeroPhotoPath(path: string) {
  return path.startsWith("home/hero/") && !path.includes("..");
}

// Long enough for "Кръщене · небесно синьо", short enough to stay one pill.
const CAPTION_MAX = 60;

export async function addHeroPhoto(input: {
  path: string;
  caption: string;
}): Promise<ActionResult> {
  if (!isHeroPhotoPath(input.path)) {
    return { ok: false, error: "Невалиден път до снимката." };
  }

  const supabase = await createClient();

  // New photos go to the end of the carousel.
  const { data: lastRow } = await supabase
    .from("hero_photos")
    .select("sort")
    .order("sort", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("hero_photos").insert({
    path: input.path,
    caption: input.caption.trim().slice(0, CAPTION_MAX),
    sort: (lastRow?.sort ?? 0) + 1,
  });
  if (error) return { ok: false, error: error.message };

  revalidateCatalog();
  return { ok: true };
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

export async function deleteHeroPhoto(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // The file path comes from the row, never from the browser.
  const { data: photo } = await supabase
    .from("hero_photos")
    .select("path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("hero_photos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Best effort, as with product photos.
  if (photo) await supabase.storage.from(BUCKET).remove([photo.path]);

  revalidateCatalog();
  return { ok: true };
}
