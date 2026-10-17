"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { imageUrl } from "@/lib/images";
import { SHOWCASE_MAX_PHOTOS } from "@/lib/home";
import {
  addShowcasePhotos,
  removeShowcasePhoto,
  swapShowcasePhotoOrder,
} from "@/app/admin/actions";
import type { ActionResult } from "@/app/admin/actions";
import { SAVE_FAILED, uploadOriginal } from "@/lib/upload-photo";
import PhotoPicker from "@/components/admin/PhotoPicker";
import type { PhotoRef } from "@/lib/photo-library";
import type { ShowcasePhotoRow } from "@/lib/showcases";

const MOVE_BUTTON =
  "grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white/90 text-[1.1rem] font-extrabold text-ink shadow-[0_2px_6px_rgb(59_47_66/0.25)] hover:bg-white disabled:cursor-default disabled:opacity-0";

type Props = {
  showcaseId: string;
  photos: ShowcasePhotoRow[];
};

// A thrown action (network drop, server error) becomes a normal failure.
async function attempt(action: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await action();
  } catch {
    return { ok: false, error: SAVE_FAILED };
  }
}

// The photos of one showcase, in order. Upload new ones (they land in
// „Снимки“ too) or add ones already there. No framing step: the popup on the
// homepage shows every photo whole, and the card shows the middle of the
// first one, the cover. ‹ › reorders; „Махни“ takes a photo out of this
// showcase only.
export default function ShowcasePhotoManager({ showcaseId, photos }: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const room = SHOWCASE_MAX_PHOTOS - photos.length;
  const tooMany = `Една украса може да има до ${SHOWCASE_MAX_PHOTOS} снимки. Остават още ${Math.max(0, room)}.`;
  const locked = Boolean(busy) || picking;

  // One after another, like the gallery: each file goes into the library,
  // then into this showcase. Stops at the first failure; the ones that made
  // it still show. Too many files are refused before anything is uploaded.
  async function handleFiles(files: File[]) {
    setError("");
    if (files.length > room) {
      setError(tooMany);
    } else {
      for (const [index, file] of files.entries()) {
        setBusy(`Качване ${index + 1} от ${files.length}…`);
        const original = await uploadOriginal(file);
        if (!original.ok) {
          setError(`${file.name}: ${original.error}`);
          break;
        }
        const result = await attempt(() =>
          addShowcasePhotos(showcaseId, [original.photo.id]),
        );
        if (!result.ok) {
          setError(`${file.name}: ${result.error} Снимката остана в „Снимки“.`);
          break;
        }
      }
    }
    setBusy("");
    if (fileInput.current) fileInput.current.value = "";
    router.refresh();
  }

  // Runs one save action with the busy message, then reloads the list.
  async function run(message: string, action: () => Promise<ActionResult>) {
    setError("");
    setBusy(message);
    const result = await attempt(action);
    setBusy("");
    if (!result.ok) setError(result.error);
    router.refresh();
  }

  // Photos already in the showcase are skipped by the action.
  function handlePicked(picked: PhotoRef[]) {
    setPicking(false);
    if (picked.length === 0) return;
    run("Добавяне…", () =>
      addShowcasePhotos(showcaseId, picked.map((photo) => photo.id)),
    );
  }

  function handleMove(from: number, to: number) {
    const first = photos[Math.min(from, to)];
    const second = photos[Math.max(from, to)];
    run("Подреждане…", () =>
      swapShowcasePhotoOrder(
        { id: first.id, sort: first.sort },
        { id: second.id, sort: second.sort },
      ),
    );
  }

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="text-lg">Снимки</h2>
        <span className="text-[0.85rem] font-bold text-muted tabular-nums">
          {photos.length} от {SHOWCASE_MAX_PHOTOS}
        </span>
      </div>
      <p className="mt-1 text-[0.85rem] text-muted">
        Качете снимки или добавете от „Снимки“. В прозореца на началната
        страница се виждат цели, една под друга. Първата е корицата на
        картата — подредете ги със стрелките.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          disabled={locked || room <= 0}
          onChange={(event) => {
            const files = event.target.files;
            if (files?.length) handleFiles(Array.from(files));
          }}
          className="cursor-pointer rounded-item border border-border-strong bg-bg px-3 py-2.5 text-[0.9rem] file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-cta file:px-4 file:py-1.5 file:font-extrabold file:text-white disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setPicking(true)}
          disabled={locked || room <= 0}
          className="cursor-pointer rounded-full border-[1.5px] border-ink px-4 py-2 text-[0.85rem] font-extrabold text-ink hover:border-cta hover:text-cta disabled:opacity-50"
        >
          Избери от библиотеката
        </button>
      </div>

      {room <= 0 && (
        <p className="mt-3 text-[0.85rem] font-bold text-muted">
          Украсата има максималните {SHOWCASE_MAX_PHOTOS} снимки. Махнете
          някоя, за да добавите друга.
        </p>
      )}
      {busy && <p className="mt-3 text-[0.85rem] font-bold text-muted">{busy}</p>}
      {error && (
        <p className="mt-3 rounded-item bg-booked/10 px-3 py-2 text-[0.85rem] font-bold text-booked">
          {error}
        </p>
      )}

      {photos.length === 0 ? (
        <p className="mt-5 rounded-item border border-dashed border-border-strong px-4 py-6 text-center text-[0.9rem] text-muted">
          Още няма снимки. Украсата се показва на началната страница едва
          когато има поне една.
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              className="overflow-hidden rounded-item border border-border"
            >
              <div className="relative aspect-[4/5] bg-surface-2">
                <Image
                  src={imageUrl(photo.photo.path)}
                  alt=""
                  fill
                  sizes="200px"
                  className="object-cover"
                />
                {index === 0 && (
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-cta px-2 py-0.5 text-[0.7rem] font-extrabold text-white">
                    Корица
                  </span>
                )}
                <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between">
                  <button
                    type="button"
                    aria-label="Премести по-напред"
                    onClick={() => handleMove(index, index - 1)}
                    disabled={locked || index === 0}
                    className={MOVE_BUTTON}
                  >
                    ‹
                  </button>
                  <span className="rounded-full bg-ink/80 px-2 py-0.5 text-[0.72rem] font-extrabold text-white tabular-nums">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    aria-label="Премести по-назад"
                    onClick={() => handleMove(index, index + 1)}
                    disabled={locked || index === photos.length - 1}
                    className={MOVE_BUTTON}
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="flex justify-end p-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm("Да махна снимката от украсата? Тя остава в „Снимки“.")) return;
                    run("Махане…", () => removeShowcasePhoto(photo.id));
                  }}
                  disabled={locked}
                  className="cursor-pointer text-[0.75rem] font-extrabold text-booked hover:underline disabled:opacity-50"
                >
                  Махни
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {picking && (
        <PhotoPicker
          title="Добави в украсата"
          filter="all"
          multiple
          onCancel={() => setPicking(false)}
          onPick={handlePicked}
        />
      )}
    </section>
  );
}
