import Link from "next/link";
import { notFound } from "next/navigation";
import { getShowcaseRow } from "@/lib/showcases";
import ShowcaseForm from "@/components/admin/ShowcaseForm";
import ShowcasePhotoManager from "@/components/admin/ShowcasePhotoManager";

export default async function EditShowcasePage({
  params,
}: PageProps<"/admin/showcases/[id]">) {
  const { id } = await params;
  const showcase = await getShowcaseRow(id);
  if (!showcase) notFound();

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/showcases"
          className="text-[0.85rem] font-bold text-muted hover:text-cta"
        >
          ← Всички украси
        </Link>
        {/* Its own page once it has a slug and a photo; the homepage otherwise. */}
        <Link
          href={
            showcase.slug && showcase.showcase_photos.length > 0
              ? `/ukrasi/${showcase.slug}`
              : "/"
          }
          className="ml-auto text-[0.85rem] font-bold text-muted hover:text-cta"
        >
          Виж на сайта →
        </Link>
      </div>

      <h1 className="mt-3 mb-6 text-2xl">{showcase.title}</h1>

      <div className="space-y-5">
        <ShowcaseForm showcase={showcase} />
        <ShowcasePhotoManager
          showcaseId={showcase.id}
          photos={showcase.showcase_photos}
        />
      </div>
    </>
  );
}
