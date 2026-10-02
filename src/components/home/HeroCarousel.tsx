"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import Image from "next/image";
import { PLACEHOLDER_COLORS } from "@/lib/home";
import type { HeroPhoto } from "@/lib/home";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/home/Icons";

// Coverflow settings, the same numbers as Swiper's "Effect coverflow" demo.
const ROTATE = 50; // degrees a slide one step from the centre is turned
const DEPTH = 100; // px a slide one step from the centre is pushed back

// The 3D look of a slide `offset` steps from the centre: 0 = centred,
// 1 = one slide to the left, -1 = one to the right (fractions while scrolling).
// Same maths as Swiper's coverflow effect.
function coverflowTransform(offset: number) {
  return `translateZ(${-DEPTH * Math.abs(offset)}px) rotateY(${ROTATE * offset}deg)`;
}

// Turn every photo according to how far its slot is from the middle of the
// strip. Runs on every scroll frame, so it writes styles directly instead of
// going through React state.
function applyCoverflow(strip: HTMLDivElement) {
  const center = strip.scrollLeft + strip.clientWidth / 2;
  for (const slot of Array.from(strip.children) as HTMLElement[]) {
    const offset = (center - slot.offsetLeft - slot.offsetWidth / 2) / slot.offsetWidth;
    const photo = slot.firstElementChild as HTMLElement;
    photo.style.transform = coverflowTransform(offset);
    slot.style.zIndex = String(1 - Math.abs(Math.round(offset)));
    // The half turned away from you gets a shadow, deeper the further it turns.
    const [shadowLeft, shadowRight] = photo.querySelectorAll<HTMLElement>("[data-shadow]");
    shadowLeft.style.opacity = String(Math.max(0, offset));
    shadowRight.style.opacity = String(Math.max(0, -offset));
  }
}

// Slides sit edge to edge, so the centred one is just scrollLeft / slide width.
function slideWidth(strip: HTMLDivElement) {
  return (strip.firstElementChild as HTMLElement).offsetWidth;
}

function centredIndex(strip: HTMLDivElement) {
  return Math.round(strip.scrollLeft / slideWidth(strip));
}

// Portrait photos of finished decorations, as a coverflow: the centred photo
// faces you, the ones beside it turn away and sink back. Swiping is the
// browser's own scroll-snap (no library); with a mouse you can drag it, and
// the arrows move it one photo at a time. No autoplay.
export default function HeroCarousel({ photos }: { photos: HeroPhoto[] }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; scrollLeft: number } | null>(null);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState(0);

  function update(strip: HTMLDivElement) {
    applyCoverflow(strip);
    setActive(centredIndex(strip));
  }

  // Lay the slides out once the strip is on screen, and again whenever its
  // size changes (rotating a phone, resizing the window).
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const observer = new ResizeObserver(() => {
      applyCoverflow(strip);
      setActive(centredIndex(strip));
    });
    observer.observe(strip);
    return () => observer.disconnect();
  }, []);

  function scrollToSlide(index: number) {
    const strip = stripRef.current;
    if (!strip) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollTo({
      left: index * slideWidth(strip),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  // Mouse drag (touch already swipes natively). Snapping is switched off while
  // dragging so the strip follows the mouse, then we glide to the nearest photo.
  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const strip = event.currentTarget;
    // A new drag before the last glide ended: keep snapping off.
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    dragRef.current = { x: event.clientX, scrollLeft: strip.scrollLeft };
    strip.setPointerCapture(event.pointerId);
    strip.style.scrollSnapType = "none";
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    event.currentTarget.scrollLeft =
      dragRef.current.scrollLeft - (event.clientX - dragRef.current.x);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    dragRef.current = null;
    const strip = event.currentTarget;
    scrollToSlide(centredIndex(strip));
    // Snapping back on only after the glide, or it would jump there instead.
    snapTimerRef.current = setTimeout(() => {
      strip.style.scrollSnapType = "";
    }, 400);
  }

  const last = photos.length - 1;

  return (
    <section aria-label="Реализирани украси" className="pt-1 md:pt-2">
      {/* Side padding of half the screen minus half a slide, so the first and
          last photo can sit in the middle too. The top/bottom padding is room
          for the near edge of a turned photo, which comes out a bit taller. */}
      <div
        ref={stripRef}
        onScroll={(event) => update(event.currentTarget)}
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ perspective: 1200 }}
        className="no-scrollbar relative isolate flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain px-[calc(50%_-_150px)] py-3 lg:py-5 select-none lg:cursor-grab lg:px-[calc(50%_-_200px)] lg:active:cursor-grabbing"
      >
        {photos.map((photo, index) => (
          // A plain slot that scroll-snap measures, holding the photo that
          // turns. Snapping to the turned photo itself would aim at its tilted
          // 3D outline and stop off-centre. preserve-3d passes the strip's
          // perspective through the slot to the photo.
          <div
            key={photo.id}
            style={{ zIndex: 1 - index }}
            className="relative h-[375px] w-[300px] shrink-0 snap-center transform-3d lg:h-[500px] lg:w-[400px]"
          >
            <figure
              // Before the first scroll measurement: photo 0 in the middle, the
              // rest stepping away to the right.
              style={{ transform: coverflowTransform(-index) }}
              className={`absolute inset-0 overflow-hidden rounded-card lg:rounded-[24px] ${
                PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]
              }`}
            >
              {photo.src && (
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  priority={index === 0}
                  draggable={false}
                  sizes="(min-width: 1024px) 400px, 300px"
                  className="object-cover"
                />
              )}
              {photo.caption && (
                <figcaption className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-xs leading-tight font-extrabold text-ink lg:bottom-4 lg:left-4 lg:px-3.5 lg:py-[7px] lg:text-[13px]">
                  {photo.caption}
                </figcaption>
              )}
              <div
                data-shadow
                className="pointer-events-none absolute inset-0 bg-linear-to-l from-black/50 to-transparent opacity-0"
              />
              <div
                data-shadow
                className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/50 to-transparent"
                style={{ opacity: index }}
              />
            </figure>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-4 flex max-w-[1140px] items-center gap-4 px-5 md:mt-6 md:gap-6">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-border md:w-80 md:flex-none">
          <div
            className="h-full rounded-full bg-cta transition-[width] duration-300"
            style={{ width: `${((active + 1) / photos.length) * 100}%` }}
          />
        </div>
        <div className="flex gap-2.5 md:ml-auto md:gap-3">
          <button
            type="button"
            aria-label="Предишна снимка"
            disabled={active === 0}
            onClick={() => scrollToSlide(active - 1)}
            className={ARROW}
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            aria-label="Следваща снимка"
            disabled={active === last}
            onClick={() => scrollToSlide(active + 1)}
            className={ARROW}
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    </section>
  );
}

const ARROW =
  "grid h-11 w-11 place-items-center rounded-full border-[1.5px] border-border-strong bg-surface text-ink transition-[border-color,opacity] hover:enabled:border-ink disabled:cursor-default disabled:opacity-35 md:h-12 md:w-12 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta";
