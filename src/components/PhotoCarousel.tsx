"use client";

import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import Image from "next/image";
import { fullImagePath, imageUrl } from "@/lib/images";
import PhotoViewer from "@/components/PhotoViewer";
import type { ProductImage } from "@/lib/types";

type Props = {
  images: ProductImage[]; // in the order she set in the admin
  alt: string;
  sizes: string;
  priority?: boolean; // eager-load the first slide (catalog first row)
};

// A product's variation photos, one at a time. Fills the `relative` photo box
// it is dropped into, like a single <Image fill> would. Swiping is the
// browser's own scroll-snap, so it feels native on phones with no library;
// the arrows and dots scroll the same strip.
export default function PhotoCarousel({
  images,
  alt,
  sizes,
  priority = false,
}: Props) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const many = images.length > 1;

  // The strip scrolls one slide width at a time, so the slide on screen is
  // just scrollLeft / width.
  function handleScroll() {
    const strip = stripRef.current;
    if (!strip || strip.clientWidth === 0) return;
    setIndex(Math.round(strip.scrollLeft / strip.clientWidth));
  }

  function goTo(event: MouseEvent<HTMLButtonElement>, target: number) {
    // The carousel sits inside cards that react to clicks themselves.
    event.stopPropagation();
    const strip = stripRef.current;
    if (!strip) return;
    const next = (target + images.length) % images.length; // wrap around
    strip.scrollTo({ left: next * strip.clientWidth, behavior: "smooth" });
  }

  const current = images[Math.min(index, images.length - 1)];

  return (
    <div className="absolute inset-0">
      <div
        ref={stripRef}
        onScroll={handleScroll}
        className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {images.map((image, i) => (
          <div key={image.id} className="relative h-full w-full shrink-0 snap-center">
            <Image
              src={imageUrl(image.path)}
              alt={many ? `${alt} – снимка ${i + 1} от ${images.length}` : alt}
              fill
              priority={priority && i === 0}
              sizes={sizes}
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {current && (
        <PhotoViewer src={imageUrl(fullImagePath(current))} alt={alt} />
      )}

      {many && (
        <>
          <button
            type="button"
            aria-label="Предишна снимка"
            onClick={(event) => goTo(event, index - 1)}
            className={`${ARROW} left-2`}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Следваща снимка"
            onClick={(event) => goTo(event, index + 1)}
            className={`${ARROW} right-2`}
          >
            ›
          </button>

          {/* On a dark pill, so white dots still show on a light photo. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
            <div className="flex gap-1.5 rounded-full bg-ink/40 px-2 py-1.5">
              {images.map((image, i) => (
                <span
                  key={image.id}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-4 bg-white" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const ARROW =
  "absolute top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 pb-0.5 text-xl leading-none font-extrabold text-ink shadow-[0_2px_8px_rgb(59_47_66/0.25)] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta";
