import { getGalleryPhotos, getGalleryTags } from "@/lib/gallery-photos";
import { shownFromParam } from "@/lib/gallery";
import type { GalleryPhoto, GalleryTag } from "@/lib/gallery";
import GalleryTagManager from "@/components/admin/GalleryTagManager";
import GalleryPhotoManager from "@/components/admin/GalleryPhotoManager";

export default async function AdminGalleryPage({
  searchParams,
}: PageProps<"/admin/gallery">) {
  const params = await searchParams;
  const tagSlug = typeof params.tag === "string" ? params.tag : null;
  const untagged = params.untagged === "1" && !tagSlug;
  const shown = shownFromParam(params.shown);

  // The tables come from migration-gallery.sql; until that has been run the
  // queries fail, so say what to do instead of showing an error page.
  let tags: GalleryTag[] | null = null;
  let activeTag: GalleryTag | null = null;
  let photos: GalleryPhoto[] = [];
  let hasMore = false;
  try {
    tags = await getGalleryTags();
    activeTag = tags.find((tag) => tag.slug === tagSlug) ?? null;
    ({ photos, hasMore } = await getGalleryPhotos({
      tagId: activeTag?.id ?? null,
      untagged,
      limit: shown,
    }));
  } catch {
    tags = null;
  }

  return (
    <>
      <h1 className="text-2xl">Галерия</h1>
      <p className="mt-1 mb-6 text-[0.9rem] text-muted">
        Снимки от реализирани украси. Етикетите стават филтрите на страница
        „Галерия“ — показват се само етикетите, които имат снимки.
      </p>

      {tags ? (
        <div className="flex flex-col gap-6">
          <GalleryTagManager tags={tags} />
          <GalleryPhotoManager
            tags={tags}
            activeTag={activeTag}
            untagged={untagged}
            photos={photos}
            hasMore={hasMore}
            shown={shown}
          />
        </div>
      ) : (
        <p className="rounded-item bg-booked/10 px-4 py-3 text-[0.9rem] font-bold text-booked">
          Галерията не може да се зареди. Ако това е първият път, пуснете
          migration-gallery.sql в Supabase SQL редактора.
        </p>
      )}
    </>
  );
}
