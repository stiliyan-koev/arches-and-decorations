"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import Image from "next/image";

type Props = {
  src: string; // the full-size photo, e.g. imageUrl(fullImagePath(photo))
  alt: string;
};

// A small "expand" button plus a full-screen popup with the whole photo.
// Drop it inside any `relative` photo box; the button sits in its top-right
// corner. The popup is a native <dialog> opened with showModal(), which gives
// us Escape, focus handling and the top layer for free.
export default function PhotoViewer({ src, alt }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  // The dialog only becomes modal after it is in the DOM, so open it here.
  useEffect(() => {
    if (open) dialogRef.current?.showModal();
  }, [open]);

  function handleOpen(event: MouseEvent<HTMLButtonElement>) {
    // The button sits inside cards and tiles that react to clicks themselves
    // (the catalog card, the admin photo tile). Keep the click to ourselves.
    event.stopPropagation();
    setOpen(true);
  }

  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    // React bubbles events through the component tree, so without this a click
    // in the popup would also reach the card around the button.
    event.stopPropagation();
    // The photo ignores clicks (pointer-events-none), so any click that is not
    // on the ✕ lands on the dialog itself and closes the viewer.
    if (event.target === event.currentTarget) dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        aria-label="Виж снимката в цял размер"
        onClick={handleOpen}
        className="absolute top-2 right-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/85 text-ink shadow-[0_2px_8px_rgb(59_47_66/0.25)] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
      >
        <svg
          aria-hidden
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      </button>

      {/* Full screen and transparent over the dark ::backdrop, so clicks land on
          the dialog, not the backdrop. onClose fires for ✕, Escape and clicks alike. */}
      <dialog
        ref={dialogRef}
        aria-label={alt}
        onClose={() => setOpen(false)}
        onClick={handleDialogClick}
        // Keep Escape from reaching the configurator's modal, which also closes
        // on Escape. The browser still closes this dialog by itself.
        onKeyDown={(e) => {
          if (e.key === "Escape") e.stopPropagation();
        }}
        className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-ink/85"
      >
        {/* The <Image> exists only while open, so the 2000px file is not
            downloaded for every card on the page. */}
        {open && (
          <div className="pointer-events-none absolute inset-x-4 top-16 bottom-4 sm:inset-x-12 sm:bottom-12">
            <Image src={src} alt={alt} fill sizes="100vw" className="object-contain" />
          </div>
        )}
        <button
          type="button"
          aria-label="Затвори"
          onClick={() => dialogRef.current?.close()}
          className="absolute top-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-lg font-extrabold text-ink hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
        >
          ✕
        </button>
      </dialog>
    </>
  );
}
