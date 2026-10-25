"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon, ArrowUpRightIcon } from "@/components/home/Icons";
import { showcaseParagraphs } from "@/lib/home";
import type { HomeShowcase } from "@/lib/showcases";

// The popup's height on wider screens. The box that scrolls inside it needs
// the same cap, so it is written once.
const DESKTOP_MAX_HEIGHT = "md:max-h-[calc(100dvh-4rem)]";

// „Вдъхнови се“: three finished decorations from /admin/showcases.
// Each card opens a popup with its text and every photo, whole. Same place
// and layout as OccasionCards, which the homepage shows instead until three
// showcases have photos. Desktop: a 3-column grid. Phones: a swipe row.
export default function ShowcaseCards({ showcases }: { showcases: HomeShowcase[] }) {
  return (
    <section className="mx-auto max-w-[1140px] pt-2 pb-14 md:pt-4 md:pb-24">
      <div className="flex items-end justify-between gap-6 px-5">
        <div>
          <span className="text-xs font-extrabold tracking-[0.14em] text-cta uppercase md:text-[13px]">
            Украси
          </span>
          <h2 className="mt-2 text-[26px] md:mt-2.5 md:text-[40px]">
            Вдъхнови се
          </h2>
        </div>
        <Link
          href="/gallery"
          className="hidden items-center gap-2 border-b-2 border-balloon-pink py-2.5 font-extrabold text-ink transition-colors hover:border-cta hover:text-cta md:inline-flex"
        >
          Цялата галерия <ArrowRightIcon size={18} />
        </Link>
      </div>

      <ul className="no-scrollbar mt-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 md:mt-9 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible">
        {showcases.map((showcase) => (
          <li key={showcase.id} className="w-[260px] shrink-0 snap-start md:w-auto">
            <ShowcaseCard showcase={showcase} />
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-center px-5 md:hidden">
        <Link
          href="/gallery"
          className="inline-flex h-12 items-center rounded-full border-[1.5px] border-ink px-6 text-[15px] font-extrabold text-ink"
        >
          Цялата галерия
        </Link>
      </div>
    </section>
  );
}

// One card and its popup. The popup is a native <dialog> opened with
// showModal(), like PhotoViewer: Escape, focus and the top layer come free.
// It is always in the page (closed), so its text is in the HTML; its photos
// are lazy, so they load only once it opens.
function ShowcaseCard({ showcase }: { showcase: HomeShowcase }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  // True when the Back button closed the popup. Its history entry is gone
  // already then, so closing must not go back a second time.
  const closedByBack = useRef(false);

  const cardTitleId = `showcase-card-${showcase.id}`;
  const titleId = `showcase-${showcase.id}`;

  // While open: show it as a modal, lock the page behind it (like
  // MiniBasket), and let the phone's Back button close it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    if (!dialog.open) dialog.showModal();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleBack() {
      closedByBack.current = true;
      dialog?.close();
    }
    window.addEventListener("popstate", handleBack);

    return () => {
      window.removeEventListener("popstate", handleBack);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function handleOpen() {
    closedByBack.current = false;
    // An extra history entry, so Back closes the popup instead of leaving
    // the site.
    window.history.pushState(null, "");
    setOpen(true);
  }

  // Every way of closing ends here: ✕, Escape, a click beside the popup, Back.
  function handleClose() {
    setOpen(false);
    // Closed some other way than Back: take our history entry off again.
    if (!closedByBack.current) window.history.back();
  }

  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    // The content fills the dialog, so a click that lands on the dialog
    // itself is a click on the dark backdrop beside it.
    if (event.target === event.currentTarget) event.currentTarget.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-labelledby={cardTitleId}
        className="group flex w-full cursor-pointer flex-col rounded-card text-left text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-cta"
      >
        {/* Spans, not divs and headings: a button may only hold inline content. */}
        <span className="relative block aspect-[4/5] overflow-hidden rounded-card bg-surface-2">
          <span className="absolute inset-0 block transition-transform duration-[600ms] ease-out group-hover:scale-[1.04] motion-reduce:transition-none">
            <Image
              src={showcase.photos[0]}
              alt=""
              fill
              sizes="(min-width: 768px) 360px, 260px"
              className="object-cover"
            />
          </span>
          <span className="absolute top-4 right-4 hidden h-11 w-11 place-items-center rounded-full bg-white md:grid">
            <ArrowUpRightIcon size={18} />
          </span>
        </span>
        <span
          id={cardTitleId}
          className="mt-3.5 block font-display text-xl leading-[1.12] font-semibold tracking-[-0.01em] text-balance transition-colors group-hover:text-cta md:mt-5 md:text-2xl"
        >
          {showcase.title}
        </span>
        <span className="mt-1.5 line-clamp-2 text-[15px] leading-snug text-muted md:mt-2 md:text-base">
          {showcase.body}
        </span>
      </button>

      {/* Phones: full screen. Wider screens: a centered column up to 760px.
          The inner box scrolls, so the ✕ can stick to its top. */}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={handleClose}
        onClick={handleDialogClick}
        className={`m-0 h-full max-h-none w-full max-w-none overflow-hidden bg-bg p-0 text-ink backdrop:bg-ink/70 md:m-auto md:h-fit md:w-[min(760px,calc(100%-2rem))] md:rounded-card md:shadow-card ${DESKTOP_MAX_HEIGHT}`}
      >
        <div className={`h-full overflow-y-auto overscroll-contain md:h-auto ${DESKTOP_MAX_HEIGHT}`}>
          <div className="pointer-events-none sticky top-0 z-10 flex justify-end p-3">
            <button
              type="button"
              aria-label="Затвори"
              onClick={() => dialogRef.current?.close()}
              className="pointer-events-auto grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white/90 text-lg font-extrabold text-ink shadow-[0_2px_8px_rgb(0_0_0/0.3)] hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
            >
              ✕
            </button>
          </div>

          <div className="px-5 pb-8 md:px-10 md:pb-10">
            <h2 id={titleId} className="text-[26px] md:text-[32px]">
              {showcase.title}
            </h2>
            {showcaseParagraphs(showcase.body).map((text, index) => (
              <p key={index} className="mt-3 text-base leading-relaxed whitespace-pre-line md:text-[17px]">
                {text}
              </p>
            ))}

            <div className="mt-6 space-y-3">
              {showcase.photos.map((src, index) => (
                // The real size isn't stored: 4:5 holds the space until the
                // photo loads, then h-auto gives it its own shape.
                <Image
                  key={src}
                  src={src}
                  alt={`${showcase.title} — снимка ${index + 1}`}
                  width={1600}
                  height={2000}
                  sizes="(min-width: 768px) 680px, 100vw"
                  loading="lazy"
                  className="h-auto w-full rounded-item bg-surface-2"
                />
              ))}
            </div>

            {/* Its own page: a real link, so search engines find the story
                (they don't open popups), and an address to share.
                It replaces the popup's history entry, so Back from the page returns to the homepage in one step. */}
            {showcase.slug && (
              <Link
                href={`/ukrasi/${showcase.slug}`}
                replace
                onClick={() => {
                  closedByBack.current = true;
                }}
                className="mt-6 inline-flex items-center gap-2 border-b-2 border-balloon-pink py-2 font-extrabold text-ink transition-colors hover:border-cta hover:text-cta"
              >
                Отвори като страница <ArrowRightIcon size={18} />
              </Link>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
