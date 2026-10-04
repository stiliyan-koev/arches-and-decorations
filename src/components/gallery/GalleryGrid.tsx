"use client";

import { useState } from "react";
import Image from "next/image";
import GalleryLightbox from "@/components/gallery/GalleryLightbox";

export type GalleryItem = {
  id: string;
  tileUrl: string;
  fullUrl: string;
  alt: string;
  tags: { name: string; slug: string }[];
};

// The gallery tiles: 4:5, two across on phones, three on desktop. A tile
// opens the full-screen viewer, which steps through the same photos.
export default function GalleryGrid({ photos }: { photos: GalleryItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <ul className="mt-4 grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3 lg:gap-6">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`${photo.alt} — отвори на цял екран`}
              className="group relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden rounded-card bg-surface-2 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-cta"
            >
              {/* Tiles below the fold load lazily (next/image's default);
                  only the first row is fetched straight away. */}
              <Image
                src={photo.tileUrl}
                alt={photo.alt}
                fill
                sizes="(min-width: 1120px) 357px, (min-width: 1024px) 31vw, 48vw"
                priority={index < 3}
                className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
              />
              {/* Desktop hover: what the photo is, on a soft shade. */}
              {photo.tags.length > 0 && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-ink/70 to-transparent px-4 pt-10 pb-3.5 text-left text-[15px] font-extrabold text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 md:block">
                  {photo.tags.map((tag) => tag.name).join(" · ")}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {openIndex !== null && openIndex < photos.length && (
        <GalleryLightbox
          photos={photos}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
