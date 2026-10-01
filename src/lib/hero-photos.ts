import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/catalog";
import { imageUrl } from "@/lib/images";
import { HERO_PLACEHOLDERS } from "@/lib/home";
import type { HeroPhoto } from "@/lib/home";

// A row of the hero_photos table, as the admin page edits it.
export type HeroPhotoRow = {
  id: string;
  path: string;
  caption: string;
  sort: number;
};

// Every hero photo row, in the order she set. Throws on a database error:
// the admin page should say so rather than show an empty list.
export async function getHeroPhotoRows(): Promise<HeroPhotoRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hero_photos")
    .select("id, path, caption, sort")
    .order("sort");
  if (error) throw error;
  return data;
}

// The homepage carousel. Placeholder tiles until there is a database with at
// least one photo, so the page never shows an empty strip.
export async function getHeroPhotos(): Promise<HeroPhoto[]> {
  if (!isSupabaseConfigured()) return HERO_PLACEHOLDERS;

  let rows: HeroPhotoRow[];
  try {
    rows = await getHeroPhotoRows();
  } catch {
    return HERO_PLACEHOLDERS;
  }
  if (rows.length === 0) return HERO_PLACEHOLDERS;

  return rows.map((row) => ({
    id: row.id,
    src: imageUrl(row.path),
    alt: row.caption || "Реализирана украса",
    caption: row.caption,
  }));
}
