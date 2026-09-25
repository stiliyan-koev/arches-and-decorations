import Image from "next/image";
import { fullImagePath, imageUrl } from "@/lib/images";
import PhotoViewer from "@/components/PhotoViewer";
import type { ProductImage } from "@/lib/types";

type Props = {
  photo: ProductImage | null;
  alt: string;
};

// The square beside the modal fields. It shows the photo of the current
// selection and updates on every change, because its `photo` is recomputed each
// render from the draft. No inline SVG stand-ins — a product without a photo
// falls back to a neutral placeholder.
export default function PreviewPane({ photo, alt }: Props) {
  return (
    <div className="relative grid aspect-square place-items-center self-start overflow-hidden rounded-item border border-border bg-bg">
      {photo ? (
        <>
          <Image
            src={imageUrl(photo.path)}
            alt={alt}
            fill
            sizes="(max-width: 700px) 90vw, 380px"
            className="object-cover"
          />
          <PhotoViewer src={imageUrl(fullImagePath(photo))} alt={alt} />
        </>
      ) : (
        <span className="px-4 text-center text-sm text-muted">
          Снимка предстои
          <span className="mt-1.5 block text-[0.72rem]">
            Примерна визуализация · сменя се според избора
          </span>
        </span>
      )}
    </div>
  );
}
