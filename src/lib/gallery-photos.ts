import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/catalog";
import { imageUrl } from "@/lib/images";
import type { GalleryPhoto, GalleryTag } from "@/lib/gallery";
import type { CropRect } from "@/lib/resize-image";

type PhotoRow = {
  id: string;
  photo_id: string | null;
  path: string;
  full_path: string | null;
  crop: CropRect | null;
  photo: { path: string } | null;
  gallery_photo_tags: { tag_id: string }[];
};

// Every tag with how many photos it has, by name. Throws on a database error:
// the admin page should say so rather than show an empty list.
export async function getGalleryTags(): Promise<GalleryTag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_tags")
    .select("id, name, slug, gallery_photo_tags(count)")
    .order("name");
  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    count: row.gallery_photo_tags[0]?.count ?? 0,
  }));
}

// The newest `limit` photos, how many match in total, and whether there are more. All of them, only
// those with `tagId`, or (`untagged`, admin only) those with no tag at all.
// Throws on a database error.
//
// Both filters go through a second, aliased join of the tag links: filtering
// the plain join would also cut the photo's own tag list down. `only` is an
// inner join (photos with that tag); `none` keeps photos with no links.
export async function getGalleryPhotos(options: {
  tagId: string | null;
  untagged?: boolean;
  limit: number;
}): Promise<{ photos: GalleryPhoto[]; total: number; hasMore: boolean }> {
  const supabase = await createClient();
  let columns =
    "id, photo_id, path, full_path, crop, photo:photos(path), gallery_photo_tags(tag_id)";
  if (options.tagId) columns += ", only:gallery_photo_tags!inner(tag_id)";
  else if (options.untagged) columns += ", none:gallery_photo_tags(tag_id)";

  let query = supabase
    .from("gallery_photos")
    .select(columns, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id")
    .range(0, options.limit - 1);
  if (options.tagId) query = query.eq("only.tag_id", options.tagId);
  else if (options.untagged) query = query.is("none", null);

  const { data, count, error } = await query;
  if (error) throw error;

  const rows = data as unknown as PhotoRow[];
  return {
    photos: rows.map((row) => {
      // The whole photo is the library photo; full_path is the older copy.
      const fullPath = row.photo?.path ?? row.full_path ?? row.path;
      return {
        id: row.id,
        photoId: row.photo_id,
        tileUrl: imageUrl(row.path),
        fullUrl: imageUrl(fullPath),
        tilePath: row.path,
        fullPath,
        crop: row.crop,
        tagIds: row.gallery_photo_tags.map((link) => link.tag_id),
      };
    }),
    total: count ?? rows.length,
    hasMore: (count ?? 0) > rows.length,
  };
}

// The tags that have photos, for the public page, its title and the sitemap.
// Once per request (cache), so the page's metadata doesn't read them twice.
// Throws on a database error.
export const getPublicGalleryTags = cache(async () =>
  (await getGalleryTags()).filter((tag) => tag.count > 0),
);

// The public page: the tags that have photos, the one picked (if the slug
// matches one), and a page of photos. Empty until there is a database with
// the gallery tables, so the page shows its "no photos yet" state instead of
// an error.
export async function getPublicGallery(tagSlug: string | null, limit: number) {
  const empty = {
    tags: [] as GalleryTag[],
    activeTag: null as GalleryTag | null,
    photos: [] as GalleryPhoto[],
    total: 0,
    hasMore: false,
  };
  if (!isSupabaseConfigured()) return empty;

  try {
    const tags = await getPublicGalleryTags();
    const activeTag = tags.find((tag) => tag.slug === tagSlug) ?? null;
    const { photos, total, hasMore } = await getGalleryPhotos({
      tagId: activeTag?.id ?? null,
      limit,
    });
    return { tags, activeTag, photos, total, hasMore };
  } catch (error) {
    console.error("getPublicGallery: showing an empty gallery", error);
    return empty;
  }
}
