import { getHeroPhotoRows } from "@/lib/hero-photos";
import type { HeroPhotoRow } from "@/lib/hero-photos";
import HeroPhotoManager from "@/components/admin/HeroPhotoManager";

export default async function AdminHomePhotosPage() {
  // The table comes from migration-hero-photos.sql; until that has been run
  // the query fails, so say what to do instead of showing an error page.
  let photos: HeroPhotoRow[] | null = null;
  try {
    photos = await getHeroPhotoRows();
  } catch {
    photos = null;
  }

  return (
    <>
      <h1 className="text-2xl">Начална страница</h1>
      <p className="mt-1 mb-6 text-[0.9rem] text-muted">
        Снимките в карусела най-горе на началната страница.
      </p>

      {photos ? (
        <HeroPhotoManager photos={photos} />
      ) : (
        <p className="rounded-item bg-booked/10 px-4 py-3 text-[0.9rem] font-bold text-booked">
          Снимките не могат да се заредят. Ако това е първият път, пуснете
          migration-hero-photos.sql в Supabase SQL редактора.
        </p>
      )}
    </>
  );
}
