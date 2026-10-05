import { createClient } from "@/lib/supabase/server";
import { filterFromParam, queryLibrary } from "@/lib/photo-library";
import type { LibraryPhoto } from "@/lib/photo-library";
import { getGalleryTags } from "@/lib/gallery-photos";
import { shownFromParam } from "@/lib/gallery";
import type { GalleryTag } from "@/lib/gallery";
import PhotoLibraryManager from "@/components/admin/PhotoLibraryManager";

export default async function AdminPhotosPage({
  searchParams,
}: PageProps<"/admin/photos">) {
  const params = await searchParams;
  const filter = filterFromParam(params.filter);
  const shown = shownFromParam(params.shown);

  // The table comes from migration-photo-library.sql; until that has been run
  // the query fails, so say what to do instead of showing an error page.
  let library: { photos: LibraryPhoto[]; total: number; hasMore: boolean } | null = null;
  let tags: GalleryTag[] = [];
  try {
    const supabase = await createClient();
    [library, tags] = await Promise.all([
      queryLibrary(supabase, { filter, limit: shown }),
      getGalleryTags(),
    ]);
  } catch {
    library = null;
  }

  return (
    <>
      <h1 className="text-2xl">Снимки</h1>
      <p className="mt-1 mb-6 text-[0.9rem] text-muted">
        Всички снимки на сайта, на едно място. Качете снимка веднъж и я
        използвайте където искате: в карусела на началната страница, в
        галерията или в продукт. Всяко място пази своя рамка на снимката.
      </p>

      {library ? (
        <PhotoLibraryManager
          photos={library.photos}
          total={library.total}
          hasMore={library.hasMore}
          filter={filter}
          shown={shown}
          tags={tags}
        />
      ) : (
        <p className="rounded-item bg-booked/10 px-4 py-3 text-[0.9rem] font-bold text-booked">
          Снимките не могат да се заредят. Ако това е първият път, пуснете
          migration-photo-library.sql в Supabase SQL редактора.
        </p>
      )}
    </>
  );
}
