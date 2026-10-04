"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resizeToWebp } from "@/lib/resize-image";
import { PAGE_BG, imageUrl } from "@/lib/images";
import { CAPTION_MAX } from "@/lib/home";
import {
  addHeroPhoto,
  deleteHeroPhoto,
  saveHeroCaption,
  swapHeroOrder,
} from "@/app/admin/actions";
import ImageCropper from "@/components/admin/ImageCropper";
import type { CropResult } from "@/components/admin/ImageCropper";
import type { HeroPhotoRow } from "@/lib/hero-photos";

const BUCKET = "catalog";
const SAVE_FAILED = "Запазването се провали. Опитайте отново.";

// The carousel shows photos at most 400x500, so 1200px tall is plenty sharp
// on any screen and small for the Storage quota.
const PHOTO_SIZE = 1200;

const MOVE_BUTTON =
  "grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white/90 text-[0.95rem] font-extrabold text-ink shadow-[0_2px_6px_rgb(59_47_66/0.25)] hover:bg-white disabled:cursor-default disabled:opacity-0";

// Files she picked that still wait to be cropped, one at a time.
type Queue = { files: File[]; done: number };

// The homepage photo carousel: add photos (each fitted into the 4:5 frame),
// write the caption shown on each, put them in order, remove them. Every
// change is saved at once and shows on the homepage straight away.
export default function HeroPhotoManager({ photos }: { photos: HeroPhotoRow[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  function finishQueue() {
    setQueue(null);
    if (fileInput.current) fileInput.current.value = "";
    router.refresh();
  }

  function nextInQueue(current: Queue) {
    const files = current.files.slice(1);
    if (files.length === 0) finishQueue();
    else setQueue({ files, done: current.done + 1 });
  }

  // One file per photo: the framed part, shrunk. A random name, so a replaced
  // photo never shows up from an old cached URL.
  async function handleCropped(current: Queue, choice: CropResult) {
    const file = current.files[0];
    setBusy(`Качване на ${file.name}…`);

    const crop = choice.mode === "crop" ? choice.crop : undefined;
    const storage = createClient().storage.from(BUCKET);
    let path;
    let uploadError;
    try {
      const photo = await resizeToWebp(file, crop, PHOTO_SIZE, PAGE_BG);
      // The server only accepts .webp paths; a format the browser can't
      // redraw comes back as the original file.
      if (photo.ext !== "webp") {
        setBusy("");
        setError("Този формат не може да се обработи. Запазете снимката като JPG и опитайте отново.");
        finishQueue();
        return;
      }
      path = `home/hero/${crypto.randomUUID()}.webp`;
      ({ error: uploadError } = await storage.upload(path, photo.blob, {
        contentType: photo.blob.type,
      }));
    } catch {
      setBusy("");
      setError(SAVE_FAILED);
      finishQueue();
      return;
    }
    if (uploadError) {
      setBusy("");
      setError(`Качването се провали: ${uploadError.message}`);
      finishQueue(); // stop here; the ones that made it still show
      return;
    }

    let result;
    try {
      result = await addHeroPhoto({ path, caption: "" });
    } catch {
      result = { ok: false as const, error: SAVE_FAILED };
    }
    setBusy("");

    if (!result.ok) {
      await storage.remove([path]); // no row points at it
      setError(result.error);
      finishQueue(); // stop here; the ones that made it still show
      return;
    }
    nextInQueue(current);
  }

  // Runs one save action with the busy message, then reloads the list.
  async function run(message: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    setBusy(message);
    let result;
    try {
      result = await action();
    } catch {
      result = { ok: false, error: SAVE_FAILED };
    }
    setBusy("");
    if (!result.ok) setError(result.error ?? SAVE_FAILED);
    router.refresh();
  }

  function handleMove(from: number, to: number) {
    const first = photos[Math.min(from, to)];
    const second = photos[Math.max(from, to)];
    run("Подреждане…", () =>
      swapHeroOrder(
        { id: first.id, sort: first.sort },
        { id: second.id, sort: second.sort },
      ),
    );
  }

  const locked = Boolean(busy) || Boolean(queue);
  const queueTotal = queue ? queue.done + queue.files.length : 0;

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="text-lg">Снимки в карусела</h2>
      <p className="mt-1 text-[0.85rem] text-muted">
        Наместете всяка снимка в рамката — така ще изглежда на началната
        страница. Надписът е бялото етикетче върху снимката; оставете го празен,
        ако не искате етикет. Подредете снимките със стрелките.
      </p>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        disabled={locked}
        onChange={(event) => {
          const files = event.target.files;
          if (!files?.length) return;
          setError("");
          setQueue({ files: Array.from(files), done: 0 });
        }}
        className="mt-4 cursor-pointer rounded-item border border-border-strong bg-bg px-3 py-2.5 text-[0.9rem] file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-cta file:px-4 file:py-1.5 file:font-extrabold file:text-white disabled:opacity-60"
      />

      {busy && <p className="mt-3 text-[0.85rem] font-bold text-muted">{busy}</p>}
      {error && (
        <p className="mt-3 rounded-item bg-booked/10 px-3 py-2 text-[0.85rem] font-bold text-booked">
          {error}
        </p>
      )}

      {photos.length === 0 ? (
        <p className="mt-5 rounded-item border border-dashed border-border-strong px-4 py-6 text-center text-[0.9rem] text-muted">
          Още няма снимки. Докато няма, на началната страница стоят цветни
          плочки.
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
                  src={imageUrl(photo.path)}
                  alt=""
                  fill
                  sizes="200px"
                  className="object-cover"
                />
                <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between">
                  <button
                    type="button"
                    aria-label="Премести по-напред"
                    onClick={() => handleMove(index, index - 1)}
                    disabled={locked || index === 0}
                    className={MOVE_BUTTON}
                  >
                    ←
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
                    →
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 p-2">
                <CaptionField
                  photo={photo}
                  number={index + 1}
                  disabled={locked}
                  onSave={(caption) =>
                    run("Запазване…", () => saveHeroCaption(photo.id, caption))
                  }
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm("Да изтрия тази снимка от карусела?")) return;
                    run("Изтриване…", () => deleteHeroPhoto(photo.id));
                  }}
                  disabled={locked}
                  className="ml-auto cursor-pointer text-[0.75rem] font-extrabold text-booked hover:underline disabled:opacity-50"
                >
                  Изтрий
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Hidden while a photo uploads; the key gives each file a fresh frame. */}
      {queue && !busy && (
        <ImageCropper
          key={queue.done}
          source={queue.files[0]}
          title={
            queueTotal > 1
              ? `Наместете снимката (${queue.done + 1} от ${queueTotal})`
              : "Наместете снимката"
          }
          cancelLabel={queueTotal > 1 ? "Пропусни" : "Отказ"}
          onConfirm={(choice) => handleCropped(queue, choice)}
          onCancel={() => nextInQueue(queue)}
        />
      )}
    </section>
  );
}

// The caption box under a photo. „Запази“ (or Enter) only lights up once the
// text differs from what is saved.
function CaptionField({
  photo,
  number,
  disabled,
  onSave,
}: {
  photo: HeroPhotoRow;
  number: number;
  disabled: boolean;
  onSave: (caption: string) => void;
}) {
  const [caption, setCaption] = useState(photo.caption);
  const changed = caption.trim() !== photo.caption;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (changed) onSave(caption);
      }}
      className="flex gap-1.5"
    >
      <input
        value={caption}
        onChange={(event) => setCaption(event.target.value)}
        maxLength={CAPTION_MAX}
        placeholder="Надпис (по желание)"
        aria-label={`Надпис на снимка ${number}`}
        className="min-w-0 flex-1 rounded-item border border-border-strong bg-bg px-2 py-1.5 text-[0.8rem]"
      />
      <button
        type="submit"
        disabled={disabled || !changed}
        className="shrink-0 cursor-pointer rounded-full bg-cta px-3 text-[0.75rem] font-extrabold text-white hover:bg-cta-strong disabled:cursor-default disabled:opacity-40"
      >
        Запази
      </button>
    </form>
  );
}
