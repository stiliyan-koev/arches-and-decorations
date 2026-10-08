"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { LIBRARY_PAGE_SIZE, queryLibrary } from "@/lib/photo-library";
import type { LibraryFilter, LibraryPhoto, PhotoRef } from "@/lib/photo-library";

const CHIP =
  "cursor-pointer rounded-full border px-2.5 py-1 text-[0.75rem] font-extrabold transition-colors";
const CHIP_ON = "border-cta bg-cta text-white";
const CHIP_OFF = "border-border-strong bg-bg text-ink hover:border-cta";

type Props = {
  title: string;
  // Which photos to offer, e.g. "not-carousel": the carousel can't take a
  // photo twice, so those already in it are left out.
  filter: LibraryFilter;
  // Pick several and confirm (the gallery), or one click picks (the rest).
  multiple?: boolean;
  onPick: (photos: PhotoRef[]) => void;
  onCancel: () => void;
};

// What the list shows: the photos loaded for one filter and size.
type Loaded = {
  key: string;
  photos: LibraryPhoto[];
  hasMore: boolean;
  error: boolean;
};

// A popup with the photo library, to use a photo she already uploaded in
// another place. Newest first, „Покажи още“ for more, a switch to see only
// photos used nowhere yet. Reads straight from the browser: the library is
// public-read, like the site's other photo tables.
export default function PhotoPicker({
  title,
  filter,
  multiple = false,
  onPick,
  onCancel,
}: Props) {
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [limit, setLimit] = useState(LIBRARY_PAGE_SIZE);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [picked, setPicked] = useState<PhotoRef[]>([]);

  const shownFilter: LibraryFilter = unusedOnly ? "unused" : filter;
  const key = `${shownFilter}:${limit}`;
  // Still loading while the last answer is for another filter or size; the
  // old photos stay on screen meanwhile, so „Покажи още“ doesn't flash.
  const loading = loaded?.key !== key;

  useEffect(() => {
    let current = true;
    queryLibrary(createClient(), { filter: shownFilter, limit })
      .then(({ photos, hasMore }) => {
        if (current) setLoaded({ key, photos, hasMore, error: false });
      })
      .catch(() => {
        if (current) setLoaded({ key, photos: [], hasMore: false, error: true });
      });
    return () => {
      current = false;
    };
  }, [key, shownFilter, limit]);

  // Same as the cropper: lock the page behind it, Escape cancels.
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  });
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancelRef.current();
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  function handleClick(photo: LibraryPhoto) {
    const ref = { id: photo.id, path: photo.path };
    if (!multiple) {
      onPick([ref]);
      return;
    }
    setPicked(
      picked.some((item) => item.id === photo.id)
        ? picked.filter((item) => item.id !== photo.id)
        : [...picked, ref],
    );
  }

  const photos = loaded?.photos ?? [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[94vh] w-[min(880px,100%)] flex-col rounded-card bg-surface p-5 shadow-[0_24px_60px_rgb(62_47_53/0.3)]"
      >
        <h3 className="text-lg">{title}</h3>
        <p className="mt-1 text-[0.85rem] text-muted">
          {multiple
            ? "Изберете една или повече снимки от библиотеката."
            : "Изберете снимка от библиотеката."}
        </p>

        <div className="mt-3 flex gap-1.5">
          <button
            type="button"
            onClick={() => setUnusedOnly(false)}
            className={`${CHIP} ${unusedOnly ? CHIP_OFF : CHIP_ON}`}
          >
            Всички
          </button>
          <button
            type="button"
            onClick={() => setUnusedOnly(true)}
            className={`${CHIP} ${unusedOnly ? CHIP_ON : CHIP_OFF}`}
          >
            Неизползвани
          </button>
        </div>

        <div className="mt-4 min-h-[200px] flex-1 overflow-auto overscroll-contain">
          {loaded?.error ? (
            <p className="rounded-item bg-booked/10 px-3 py-2 text-[0.85rem] font-bold text-booked">
              Снимките не могат да се заредят. Опитайте отново.
            </p>
          ) : photos.length === 0 ? (
            <p className="rounded-item border border-dashed border-border-strong px-4 py-6 text-center text-[0.9rem] text-muted">
              {loading ? "Зареждане…" : "Няма снимки за избор."}
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {photos.map((photo) => {
                const isPicked = picked.some((item) => item.id === photo.id);
                return (
                  <li key={photo.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(photo)}
                      aria-pressed={multiple ? isPicked : undefined}
                      aria-label="Избери снимката"
                      className={`relative block aspect-[4/5] w-full cursor-pointer overflow-hidden rounded-item border bg-surface-2 ${
                        isPicked ? "border-cta ring-2 ring-cta" : "border-border hover:border-cta"
                      }`}
                    >
                      <Image
                        src={photo.url}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 160px, (min-width: 640px) 25vw, 33vw"
                        className="object-cover"
                      />
                      {isPicked && (
                        <span className="absolute top-1.5 left-1.5 grid h-6 w-6 place-items-center rounded-full bg-cta text-[0.8rem] font-extrabold text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {loaded?.hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setLimit(limit + LIBRARY_PAGE_SIZE)}
                disabled={loading}
                className="cursor-pointer rounded-full border-[1.5px] border-ink px-5 py-2 text-[0.9rem] font-extrabold text-ink hover:border-cta hover:text-cta disabled:opacity-50"
              >
                {loading ? "Зареждане…" : "Покажи още"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-full border border-border-strong px-5 py-2.5 font-extrabold text-muted hover:border-rose hover:text-rose-ink"
          >
            Отказ
          </button>
          {multiple && (
            <button
              type="button"
              onClick={() => onPick(picked)}
              disabled={picked.length === 0}
              className="cursor-pointer rounded-full bg-cta px-6 py-2.5 font-extrabold text-white hover:bg-cta-strong disabled:opacity-60"
            >
              Добави{picked.length ? ` (${picked.length})` : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
