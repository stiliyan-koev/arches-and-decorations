"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Every write here runs through the logged-in user's cookies, so RLS sees
// `authenticated` and the "admin all …" policies in schema.sql apply. There is
// no service key anywhere in this app.

const BUCKET = "catalog";

export type ActionResult = { ok: true } | { ok: false; error: string };

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
    .select("path")
    .eq("product_id", id);

  if (images?.length) {
    await supabase.storage.from(BUCKET).remove(images.map((i) => i.path));
  }

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

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
    .select("path")
    .eq("color_id", id);

  if (images?.length) {
    await supabase.storage.from(BUCKET).remove(images.map((i) => i.path));
  }

  const { error } = await supabase.from("product_colors").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateCatalog();
  return { ok: true };
}

// ---------- Photos ----------

// The file itself is uploaded straight from the browser to Storage — it never
// passes through the server. This only records where it landed.
export async function attachImage(input: {
  product_id: string;
  color_id: string | null;
  path: string;
  sort: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("product_images").insert(input);
  if (error) return { ok: false, error: error.message };

  revalidateCatalog();
  return { ok: true };
}

// A re-cropped photo is uploaded under a new name (the old public URL is
// cached), so point the row at it and drop the old file.
export async function replaceImage(
  id: string,
  path: string,
): Promise<ActionResult> {
  // The new path comes from the browser, so only accept one inside the
  // product photos folder.
  if (!path.startsWith("products/") || path.includes("..")) {
    return { ok: false, error: "Невалиден път до снимката." };
  }

  const supabase = await createClient();

  const { data: image } = await supabase
    .from("product_images")
    .select("path")
    .eq("id", id)
    .maybeSingle();

  // An unknown id (or one RLS hides) updates nothing and is not an error, so
  // check that a row actually changed before removing any file.
  const { data: updated, error } = await supabase
    .from("product_images")
    .update({ path })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!updated || updated.length === 0) {
    return { ok: false, error: "Снимката не е намерена." };
  }

  // Best effort, as in deleteImage.
  if (image && image.path !== path) {
    await supabase.storage.from(BUCKET).remove([image.path]);
  }

  revalidateCatalog();
  return { ok: true };
}

export async function deleteImage(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // The file path comes from the row, not from the browser, so this can only
  // ever remove the file that belongs to this photo.
  const { data: image } = await supabase
    .from("product_images")
    .select("path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("product_images").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Best effort: the row is what the site reads, so a stranded file is
  // untidy rather than broken.
  if (image) await supabase.storage.from(BUCKET).remove([image.path]);

  revalidateCatalog();
  return { ok: true };
}
