"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { imageUrl } from "@/lib/images";
import { CAPTION_MAX } from "@/lib/home";
import {
  removeHeroPhoto,
  replaceHeroTile,
  saveHeroCaption,
  swapHeroOrder,
} from "@/app/admin/actions";
import {
  HERO_TILE_SIZE,
  SAVE_FAILED,
  addToCarousel,
  downloadOriginal,
  makeTile,
  removeFiles,
  uploadOriginal,
} from "@/lib/upload-photo";
import type { SaveResult } from "@/lib/upload-photo";
import ImageCropper from "@/components/admin/ImageCropper";
import PhotoPicker from "@/components/admin/PhotoPicker";
import type { CropResult } from "@/components/admin/ImageCropper";
import type { HeroPhotoRow } from "@/lib/hero-photos";
import type { PhotoRef } from "@/lib/photo-library";

const MOVE_BUTTON =
  "grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white/90 text-[0.95rem] font-extrabold text-ink shadow-[0_2px_6px_rgb(59_47_66/0.25)] hover:bg-white disabled:cursor-default disabled:opacity-0";
const LINK_BUTTON =
  "cursor-pointer text-[0.75rem] font-extrabold hover:underline disabled:opacity-50";

// What the cropper is open for: files she just picked (one at a time), a
// photo from the library, or a new framing for a photo already in the strip.
type Upload = { kind: "upload"; files: File[]; done: number };
type FromLibrary = { kind: "library"; photo: PhotoRef; blob: Blob };
type Recrop = { kind: "recrop"; row: HeroPhotoRow; photo: PhotoRef; blob: Blob };
type Framing = Upload | FromLibrary | Recrop;

// The homepage photo carousel. Its photos come from the library („Снимки“):
// upload new ones here (they land in the library too) or add ones already
// there, each framed for the carousel. Then write the caption shown on each,
// put them in order, re-frame or take them out. Every change is saved at once
// and shows on the homepage straight away.
export default function HeroPhotoManager({ photos }: { photos: HeroPhotoRow[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [framing, setFraming] = useState<Framing | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  // Closes the cropper, shows the error (if any) and reloads the list.
  function finish(message = "") {
    setFraming(null);
    setBusy("");
    if (message) setError(message);
    if (fileInput.current) fileInput.current.value = "";
    router.refresh();
  }

  function nextUpload(current: Upload) {
    const files = current.files.slice(1);
    if (files.length === 0) finish();
    else setFraming({ kind: "upload", files, done: current.done + 1 });
  }

  // A new file: into the library first, then into the carousel. If the second
  // step fails the photo is still in „Снимки“, so nothing is lost.
  async function handleUpload(current: Upload, choice: CropResult) {
    const file = current.files[0];
    setBusy(`Качване на ${file.name}…`);
    const original = await uploadOriginal(file);
    if (!original.ok) {
      finish(original.error); // stop here; the ones that made it still show
      return;
    }
    const result = await addToCarousel(original.photo, file, choice, original.scale);
    if (!result.ok) {
      finish(`${result.error ?? SAVE_FAILED} Снимката остана в „Снимки“.`);
      return;
    }
    setBusy("");
    nextUpload(current);
  }

  async function handleLibrary(current: FromLibrary, choice: CropResult) {
    setBusy("Запазване…");
    const result = await addToCarousel(current.photo, current.blob, choice);
    finish(result.ok ? "" : (result.error ?? SAVE_FAILED));
  }

  // The new tile gets a new name (the old URL is cached); the library photo
  // is never touched. „Без изрязване“ makes the library photo the tile.
  async function handleRecrop(current: Recrop, choice: CropResult) {
    const { row, photo } = current;
    if (choice.mode === "original" && row.path === photo.path) {
      finish();
      return;
    }
    setBusy("Запазване…");
    const tile = await makeTile(
      photo,
      current.blob,
      choice.mode === "crop" ? choice.crop : null,
      "home/hero",
      HERO_TILE_SIZE,
    );
    if (!tile.ok) {
      finish(tile.error);
      return;
    }
    let result: SaveResult;
    try {
      result = await replaceHeroTile(row.id, { path: tile.path, crop: tile.crop });
    } catch {
      result = { ok: false, error: SAVE_FAILED };
    }
    if (!result.ok && tile.path !== photo.path) await removeFiles([tile.path]);
    finish(result.ok ? "" : (result.error ?? SAVE_FAILED));
  }

  function handleConfirm(choice: CropResult) {
    if (!framing) return;
    if (framing.kind === "upload") handleUpload(framing, choice);
    else if (framing.kind === "library") handleLibrary(framing, choice);
    else handleRecrop(framing, choice);
  }

  // Downloads the library photo (the whole photo, not the tile), so the frame
  // can be set from scratch.
  async function openFraming(photo: PhotoRef, row?: HeroPhotoRow) {
    setError("");
    setBusy("Зареждане на снимката…");
    const blob = await downloadOriginal(photo.path);
    setBusy("");
    if (!blob) {
      setError("Снимката не може да се зареди.");
      return;
    }
    setFraming(row ? { kind: "recrop", row, photo, blob } : { kind: "library", photo, blob });
  }

  // Runs one save action with the busy message, then reloads the list.
  async function run(message: string, action: () => Promise<SaveResult>) {
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

  const locked = Boolean(busy) || Boolean(framing) || picking;
  const uploadTotal = framing?.kind === "upload" ? framing.done + framing.files.length : 0;
  const cropperTitle =
    framing?.kind === "upload" && uploadTotal > 1
      ? `Наместете снимката (${framing.done + 1} от ${uploadTotal})`
      : "Наместете снимката";

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="text-lg">Снимки в карусела</h2>
      <p className="mt-1 text-[0.85rem] text-muted">
        Качете нова снимка или добавете от „Снимки“, и я наместете в рамката —
        така ще изглежда на началната страница. Надписът е бялото етикетче
        върху снимката; оставете го празен, ако не искате етикет. Подредете
        снимките със стрелките.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
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
            setFraming({ kind: "upload", files: Array.from(files), done: 0 });
          }}
          className="cursor-pointer rounded-item border border-border-strong bg-bg px-3 py-2.5 text-[0.9rem] file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-cta file:px-4 file:py-1.5 file:font-extrabold file:text-white disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setPicking(true)}
          disabled={locked}
          className="cursor-pointer rounded-full border-[1.5px] border-ink px-4 py-2 text-[0.85rem] font-extrabold text-ink hover:border-cta hover:text-cta disabled:opacity-50"
        >
          + Добави от „Снимки“
        </button>
      </div>

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
          {photos.map((photo, index) => {
            // The library photo to re-frame from. Rows not linked to the
            // library yet (from the old admin) have none.
            const original =
              photo.photo && photo.photo_id
                ? { id: photo.photo_id, path: photo.photo.path }
                : null;
            return (
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
                  {photo.photo && !photo.photo.has_original && (
                    <span className="absolute top-1.5 left-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[0.68rem] font-bold text-white">
                      Няма оригинал
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
                  <div className="flex items-center justify-between gap-2">
                    {original ? (
                      <button
                        type="button"
                        onClick={() => openFraming(original, photo)}
                        disabled={locked}
                        className={`${LINK_BUTTON} text-cta`}
                      >
                        Изрежи
                      </button>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm("Да махна тази снимка от карусела? Тя остава в „Снимки“.")) return;
                        run("Махане…", () => removeHeroPhoto(photo.id));
                      }}
                      disabled={locked}
                      className={`${LINK_BUTTON} text-booked`}
                    >
                      Махни от карусела
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {picking && (
        <PhotoPicker
          title="Добави в карусела"
          filter="not-carousel"
          onCancel={() => setPicking(false)}
          onPick={([photo]) => {
            setPicking(false);
            if (photo) openFraming(photo);
          }}
        />
      )}

      {/* Hidden while a photo uploads; the key gives each file a fresh frame. */}
      {framing && !busy && (
        <ImageCropper
          key={framing.kind === "upload" ? `upload-${framing.done}` : framing.kind}
          source={framing.kind === "upload" ? framing.files[0] : framing.blob}
          initialCrop={framing.kind === "recrop" ? (framing.row.crop ?? undefined) : undefined}
          title={cropperTitle}
          cancelLabel={uploadTotal > 1 ? "Пропусни" : "Отказ"}
          onConfirm={handleConfirm}
          onCancel={() => (framing.kind === "upload" ? nextUpload(framing) : finish())}
          onLoadError={
            framing.kind === "upload"
              ? undefined
              : () => finish("Снимката не може да се отвори за изрязване.")
          }
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
