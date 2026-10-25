import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/catalog";
import { imageUrl } from "@/lib/images";
import { HOME_SHOWCASE_COUNT } from "@/lib/home";

// Showcases („Украси“): finished decorations, each a title, a short text and
// several library photos. The first three by sort that have a photo are the
// cards on the homepage. Managed from /admin/showcases. There are no tiles:
// the photos are shown whole, and the card crops its cover with CSS.

// One photo of a showcase: its showcase_photos row and the library photo.
export type ShowcasePhotoRow = {
  id: string;
  photo_id: string;
  sort: number;
  photo: { path: string };
};

// A row of the showcases table, as the admin pages edit it, with its photos
// in order. The first photo is the cover.
export type ShowcaseRow = {
  id: string;
  title: string;
  body: string;
  sort: number;
  slug: string | null; // its page, /showcases/<slug>; null until migration-showcase-slug.sql
  showcase_photos: ShowcasePhotoRow[];
};

// One showcase as the homepage shows it.
export type HomeShowcase = {
  id: string;
  title: string;
  body: string;
  slug: string | null; // its own page, /showcases/<slug>
  photos: string[]; // full image URLs, in order; the first is the cover
};

const COLUMNS = "id, title, body, sort, slug, showcase_photos(id, photo_id, sort, photo:photos(path))";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Every showcase, in the order she set, each with its photos in order.
// Throws on a database error: the admin page should say so rather than show
// an empty list.
export async function getShowcaseRows(): Promise<ShowcaseRow[]> {
  return readShowcaseRows(await createClient());
}

// The query itself. The homepage passes the cookie-free client, so it can be
// cached; the admin passes the session one.
async function readShowcaseRows(supabase: SupabaseClient): Promise<ShowcaseRow[]> {
  const { data, error } = await supabase
    .from("showcases")
    .select(COLUMNS)
    .order("sort")
    .order("id")
    .order("sort", { referencedTable: "showcase_photos" })
    .order("id", { referencedTable: "showcase_photos" });
  if (error) throw error;
  return data as unknown as ShowcaseRow[];
}

// One showcase for its edit page, or null when there is no such id (a typo in
// the URL included). Throws on a database error.
export async function getShowcaseRow(id: string): Promise<ShowcaseRow | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("showcases")
    .select(COLUMNS)
    .eq("id", id)
    .order("sort", { referencedTable: "showcase_photos" })
    .order("id", { referencedTable: "showcase_photos" })
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ShowcaseRow | null;
}

// The homepage cards: the first HOME_SHOWCASE_COUNT showcases that have a
// photo. Empty until there is a database with the tables (or on any error):
// the homepage then shows the occasion cards instead.
export async function getHomeShowcases(): Promise<HomeShowcase[]> {
  if (!isSupabaseConfigured()) return [];

  let rows: ShowcaseRow[];
  try {
    rows = await readShowcaseRows(createPublicClient());
  } catch (error) {
    console.error("getHomeShowcases: showing the occasion cards instead", error);
    return [];
  }

  return rows
    .filter((row) => row.showcase_photos.length > 0)
    .slice(0, HOME_SHOWCASE_COUNT)
    .map(toHomeShowcase);
}

function toHomeShowcase(row: ShowcaseRow): HomeShowcase {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    slug: row.slug,
    photos: row.showcase_photos.map((photo) => imageUrl(photo.photo.path)),
  };
}

// One showcase for its own page, /showcases/<slug>, or null when there is no
// such slug or it has no photo yet (a page without photos isn't worth
// showing). Null on a database error too: the page then says "not found".
export async function getShowcaseBySlug(slug: string): Promise<HomeShowcase | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await createPublicClient()
    .from("showcases")
    .select(COLUMNS)
    .eq("slug", slug)
    .order("sort", { referencedTable: "showcase_photos" })
    .order("id", { referencedTable: "showcase_photos" })
    .maybeSingle();
  if (error) {
    console.error("getShowcaseBySlug: showing not found", error);
    return null;
  }
  const row = data as unknown as ShowcaseRow | null;
  if (!row || row.showcase_photos.length === 0) return null;
  return toHomeShowcase(row);
}

// The addresses of every showcase page, for the sitemap: those with a slug
// and at least one photo. Throws on a database error.
export async function getShowcaseSlugs(): Promise<string[]> {
  const rows = await readShowcaseRows(createPublicClient());
  return rows
    .filter((row) => row.slug && row.showcase_photos.length > 0)
    .map((row) => row.slug as string);
}
