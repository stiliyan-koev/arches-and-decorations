"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { galleryHref } from "@/lib/gallery";
import type { GalleryItem } from "@/components/gallery/GalleryGrid";

// How far a finger has to travel sideways to count as a swipe, in pixels.
const SWIPE_DISTANCE = 50;

type Props = {
  photos: GalleryItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

const ROUND_BUTTON =
  "grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white/90 text-ink shadow-[0_2px_8px_rgb(0_0_0/0.3)] hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta disabled:cursor-default disabled:opacity-0";

// The full-screen viewer: the whole photo, ‹ › to step (also the arrow keys
// and a sideways swipe), ✕ / Escape / a click beside the photo to close.
// Under the photo, its tags: each opens the gallery filtered to it, for
// "more like this one".
// A native <dialog> with showModal(), like PhotoViewer, so Escape, focus and
// the top layer come for free. It stops at the first and last photo.
export default function GalleryLightbox({ photos, index, onIndexChange, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Where a swipe started, and whether the last pointer-up was a swipe (then
  // the click that follows it must not close the viewer).
  const swipeStart = useRef<number | null>(null);
  const swiped = useRef(false);

  // Mounted only while open, so open it straight away.
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  function step(by: -1 | 1) {
    const next = index + by;
    if (next >= 0 && next < photos.length) onIndexChange(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "ArrowLeft") step(-1);
    if (event.key === "ArrowRight") step(1);
  }

  function handlePointerDown(event: PointerEvent<HTMLDialogElement>) {
    swipeStart.current = event.clientX;
    swiped.current = false;
  }

  function handlePointerUp(event: PointerEvent<HTMLDialogElement>) {
    if (swipeStart.current === null) return;
    const distance = event.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(distance) < SWIPE_DISTANCE) return;
    swiped.current = true;
    // A finger moving left brings in the next photo, like turning a page.
    step(distance < 0 ? 1 : -1);
  }

  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    // The photo ignores clicks (pointer-events-none), so a click that is not on
    // a button lands on the dialog itself and closes the viewer.
    if (event.target === event.currentTarget) dialogRef.current?.close();
  }

  // The current photo plus its neighbours, so stepping shows the next photo
  // at once instead of waiting for it. Only the current one is visible.
  const nearby = [index - 1, index, index + 1].filter((i) => i >= 0 && i < photos.length);
  const current = photos[index];

  return (
    <dialog
      ref={dialogRef}
      aria-label={current.alt}
      onClose={onClose}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        swipeStart.current = null;
      }}
      className="m-0 h-full max-h-none w-full max-w-none touch-pan-y bg-transparent p-0 backdrop:bg-ink/90"
    >
      {nearby.map((i) => (
        <div
          key={photos[i].id}
          aria-hidden={i !== index}
          className={`pointer-events-none absolute inset-x-4 top-16 bottom-20 sm:inset-x-20 ${
            i === index ? "" : "invisible"
          }`}
        >
          <Image
            src={photos[i].fullUrl}
            alt={i === index ? photos[i].alt : ""}
            fill
            sizes="100vw"
            loading="eager"
            className="object-contain"
          />
        </div>
      ))}

      <p
        aria-live="polite"
        className="absolute top-5 left-5 rounded-full bg-white/90 px-3 py-1 text-[0.85rem] font-extrabold text-ink tabular-nums"
      >
        {index + 1} / {photos.length}
      </p>

      <button
        type="button"
        aria-label="Затвори"
        onClick={() => dialogRef.current?.close()}
        className={`absolute top-3 right-3 text-lg font-extrabold ${ROUND_BUTTON}`}
      >
        ✕
      </button>

      {/* Wider screens: one arrow on each side of the photo. */}
      <div className="hidden sm:contents">
        <button
          type="button"
          aria-label="Предишна снимка"
          onClick={() => step(-1)}
          disabled={!hasPrev}
          className={`absolute top-1/2 left-4 -translate-y-1/2 ${ROUND_BUTTON}`}
        >
          <Chevron direction="left" />
        </button>
        <button
          type="button"
          aria-label="Следваща снимка"
          onClick={() => step(1)}
          disabled={!hasNext}
          className={`absolute top-1/2 right-4 -translate-y-1/2 ${ROUND_BUTTON}`}
        >
          <Chevron direction="right" />
        </button>
      </div>

      {/* The bottom bar: the photo's tags, and on phones the arrows either
          side of them, under the thumb. */}
      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-2 sm:justify-center">
        <button
          type="button"
          aria-label="Предишна снимка"
          onClick={() => step(-1)}
          disabled={!hasPrev}
          className={`shrink-0 sm:hidden ${ROUND_BUTTON}`}
        >
          <Chevron direction="left" />
        </button>
        <div className="no-scrollbar flex min-w-0 gap-1.5 overflow-x-auto">
          {current.tags.map((tag) => (
            <Link
              key={tag.slug}
              href={galleryHref(tag)}
              // Close first: on the tag already filtered, the grid stays and the
              // list shrinks back to its first page, so this index may be gone.
              onClick={() => dialogRef.current?.close()}
              className="shrink-0 rounded-full bg-white/90 px-3.5 py-2 text-[0.85rem] font-extrabold whitespace-nowrap text-ink hover:bg-white hover:text-cta focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
            >
              {tag.name}
            </Link>
          ))}
        </div>
        <button
          type="button"
          aria-label="Следваща снимка"
          onClick={() => step(1)}
          disabled={!hasNext}
          className={`shrink-0 sm:hidden ${ROUND_BUTTON}`}
        >
          <Chevron direction="right" />
        </button>
      </div>
    </dialog>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}
