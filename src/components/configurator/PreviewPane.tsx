import Image from "next/image";
import { fullImagePath, imageUrl } from "@/lib/images";
import PhotoViewer from "@/components/PhotoViewer";
import PhotoCarousel from "@/components/PhotoCarousel";
import type { ProductImage } from "@/lib/types";

type Props = {
  photo: ProductImage | null;
  carousel: ProductImage[]; // variation photos; when any, shown instead of `photo`
  alt: string;
};

const SIZES = "(max-width: 700px) 90vw, 380px";

// The square beside the modal fields. It shows the photo of the current
// selection and updates on every change, because its `photo` is recomputed each
// render from the draft. No inline SVG stand-ins — a product without a photo
// falls back to a neutral placeholder. A product with a carousel shows that
// instead; the key restarts it at the first photo when the product changes.
export default function PreviewPane({ photo, carousel, alt }: Props) {
  return (
    <div className="relative grid aspect-square place-items-center self-start overflow-hidden rounded-item border border-border bg-bg">
      {carousel.length > 0 ? (
        <PhotoCarousel
          key={carousel[0].id}
          images={carousel}
          alt={alt}
          sizes={SIZES}
        />
      ) : photo ? (
        <>
          <Image
            src={imageUrl(photo.path)}
            alt={alt}
            fill
            sizes={SIZES}
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
