import type { Metadata } from "next";
import Link from "next/link";
import { getPublicGallery } from "@/lib/gallery-photos";
import { GALLERY_PAGE_SIZE, galleryHref, photoAlt, shownFromParam } from "@/lib/gallery";
import GalleryGrid from "@/components/gallery/GalleryGrid";
import GalleryFilters from "@/components/gallery/GalleryFilters";

export const metadata: Metadata = {
  title: "Галерия",
  description:
    "Реализирани балонни декорации и арки във Варна — рождени дни, кръщенета, сватби и тематични партита. Разгледайте по повод.",
};

// "1 снимка", "5 снимки".
function photoCount(count: number) {
  return count === 1 ? "1 снимка" : `${count} снимки`;
}

export default async function GalleryPage({ searchParams }: PageProps<"/gallery">) {
  const params = await searchParams;
  const tagSlug = typeof params.tag === "string" ? params.tag : null;
  const shown = shownFromParam(params.shown);

  // An unknown or empty tag shows every photo.
  const { tags, activeTag, photos, total, hasMore } = await getPublicGallery(tagSlug, shown);
  const items = photos.map((photo) => ({
    id: photo.id,
    tileUrl: photo.tileUrl,
    fullUrl: photo.fullUrl,
    alt: photoAlt(photo, tags),
    tags: tags
      .filter((tag) => photo.tagIds.includes(tag.id))
      .map((tag) => ({ name: tag.name, slug: tag.slug })),
  }));

  // „Покажи още“ keeps the filter and asks for one more page.
  const moreHref = `${galleryHref(activeTag)}${activeTag ? "&" : "?"}shown=${shown + GALLERY_PAGE_SIZE}`;

  return (
    <div className="mx-auto max-w-[1120px] px-5 pt-14 pb-16">
      <h1 className="text-4xl font-bold text-ink">Галерия</h1>
      <p className="mt-3 max-w-[620px] text-muted">
        Украси, които вече сме направили. Изберете повод, за да видите само
        него, и отворете снимка, за да я разгледате на цял екран.
      </p>

      {tags.length > 0 && <GalleryFilters tags={tags} activeTag={activeTag} />}

      {items.length === 0 ? (
        <p className="mt-10 rounded-card border border-dashed border-border-strong px-5 py-12 text-center text-muted">
          Очаквайте скоро — подреждаме снимките от последните ни украси.
        </p>
      ) : (
        <>
          <p className="mt-6 text-[15px] text-muted" aria-live="polite">
            {activeTag ? (
              <>
                <strong className="font-extrabold text-ink">{activeTag.name}</strong> ·{" "}
                {photoCount(total)}
              </>
            ) : (
              photoCount(total)
            )}
          </p>
          {/* The key starts the grid afresh (viewer closed) when the filter changes. */}
          <GalleryGrid key={activeTag?.id ?? "all"} photos={items} />
        </>
      )}

      {hasMore && (
        <div className="mt-10 flex flex-col items-center gap-3">
          <p className="text-[15px] text-muted tabular-nums">
            Показани {items.length} от {total}
          </p>
          <Link
            href={moreHref}
            scroll={false}
            className="inline-flex h-12 items-center rounded-full border-[1.5px] border-ink px-7 text-[15px] font-extrabold text-ink transition-colors hover:border-cta hover:text-cta"
          >
            Покажи още
          </Link>
        </div>
      )}
    </div>
  );
}
