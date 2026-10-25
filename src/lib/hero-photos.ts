import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/catalog";
import { imageUrl } from "@/lib/images";
import { HERO_PLACEHOLDERS } from "@/lib/home";
import type { HeroPhoto } from "@/lib/home";
import type { CropRect } from "@/lib/resize-image";

// A row of the hero_photos table, as the admin page edits it, with the
// library photo it is cut from (null only for rows not linked yet).
export type HeroPhotoRow = {
  id: string;
  photo_id: string | null;
  path: string;
  crop: CropRect | null;
  caption: string;
  sort: number;
  photo: { path: string; has_original: boolean } | null;
};

// Every hero photo row, in the order she set. Throws on a database error:
// the admin page should say so rather than show an empty list.
export async function getHeroPhotoRows(): Promise<HeroPhotoRow[]> {
  return readHeroPhotoRows(await createClient());
}

// The query itself. The homepage passes the cookie-free client, so it can be
// cached; the admin passes the session one.
async function readHeroPhotoRows(supabase: SupabaseClient): Promise<HeroPhotoRow[]> {
  const { data, error } = await supabase
    .from("hero_photos")
    .select("id, photo_id, path, crop, caption, sort, photo:photos(path, has_original)")
    .order("sort")
    .order("id");
  if (error) throw error;
  return data as unknown as HeroPhotoRow[];
}

// The homepage carousel. Placeholder tiles until there is a database with at
// least one photo, so the page never shows an empty strip.
export async function getHeroPhotos(): Promise<HeroPhoto[]> {
  if (!isSupabaseConfigured()) return HERO_PLACEHOLDERS;

  let rows: HeroPhotoRow[];
  try {
    rows = await readHeroPhotoRows(createPublicClient());
  } catch (error) {
    console.error("getHeroPhotos: using the placeholder tiles", error);
    return HERO_PLACEHOLDERS;
  }
  if (rows.length === 0) return HERO_PLACEHOLDERS;

  // Without a caption the alt still has to differ from photo to photo, or
  // search engines read them as one image.
  return rows.map((row, index) => ({
    id: row.id,
    src: imageUrl(row.path),
    alt: row.caption || `Украса с балони във Варна, снимка ${index + 1}`,
    caption: row.caption,
  }));
}
