"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resizeToWebp, scaleCrop } from "@/lib/resize-image";
import type { CropRect } from "@/lib/resize-image";
import { PAGE_BG, fullImagePath, imageUrl } from "@/lib/images";
import {
  attachImage,
  deleteImage,
  swapImageOrder,
  replaceImage,
} from "@/app/admin/actions";
import { BAD_FORMAT, downloadOriginal, uploadOriginal } from "@/lib/upload-photo";
import PhotoViewer from "@/components/PhotoViewer";
import ImageCropper from "@/components/admin/ImageCropper";
import PhotoPicker from "@/components/admin/PhotoPicker";
import type { CropResult } from "@/components/admin/ImageCropper";
import type { PhotoRef } from "@/lib/photo-library";
import type { ProductColor, ProductImage } from "@/lib/types";

const BUCKET = "catalog";

// What a save action tells us back. A thrown action (network drop, server
// error) is turned into the same shape, so the busy message always clears and
// files nobody points at get cleaned up.
type SaveResult = { ok: boolean; error?: string };
const SAVE_FAILED = "Запазването се провали. Опитайте отново.";

// The tile's height (a 4:5 tile's long side). The whole photo is the library
// photo (see upload-photo.ts).
const TILE_SIZE = 1200;

type Props = {
  productId: string;
  productSlug: string;
  colors: ProductColor[];
  images: ProductImage[];
  // Carousel photos instead of the main/colour ones: no colour picker, their
  // own file names, and ← → buttons to set the order they're shown in.
  carousel?: boolean;
};

// Files she picked that are still waiting to be cropped, one at a time. The
// colour and next index are fixed when she picks them: `images` only catches
// up after the refresh at the end.
type Queue = {
  files: File[];
  colorId: string | null;
  index: number;
  done: number;
};

// An existing photo being re-cropped, its whole photo already downloaded.
type Recrop = { image: ProductImage; blob: Blob };

// A photo picked from the library, downloaded, waiting to be cropped. The
// colour and index are fixed when she picks it, like a queue's.
type Picked = { photo: PhotoRef; blob: Blob; colorId: string | null; index: number };

// The next NN for products/{slug}/{prefix}NN.ext. Scanning the paths we already
// have beats counting rows: deleting photo 02 of three shouldn't make the next
// upload collide with 03. Older whole photos sit in a full/ subfolder under
// the same name, and a re-crop moved a tile to a new NN while its whole photo
// kept the old one, so both paths count. (New whole photos go to the library,
// photos/, and never match.)
function nextIndex(images: ProductImage[], base: string) {
  let max = 0;
  for (const image of images) {
    const paths = [image.path, image.full_path?.replace("/full/", "/")];
    for (const path of paths) {
      if (!path?.startsWith(base)) continue;
      const index = parseInt(path.slice(base.length), 10);
      if (Number.isFinite(index) && index > max) max = index;
    }
  }
  return max + 1;
}

// Two-digit file number: 1 -> "01".
function fileNumber(index: number) {
  return String(index).padStart(2, "0");
}

const MOVE_BUTTON =
  "grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white/90 text-[0.95rem] font-extrabold text-ink shadow-[0_2px_6px_rgb(59_47_66/0.25)] hover:bg-white disabled:cursor-default disabled:opacity-0";

// Small label on a photo in the grid, so she can tell how it was saved.
function photoLabel(image: ProductImage) {
  // Uploaded before we kept whole photos: re-uploading gives a better result.
  if (image.has_original === false || image.full_path == null) return "Няма оригинал";
  if (image.path === image.full_path) return "Без изрязване";
  return null;
}

export default function PhotoManager({
  productId,
  productSlug,
  colors,
  images,
  carousel = false,
}: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [colorId, setColorId] = useState("");
  const [queue, setQueue] = useState<Queue | null>(null);
  const [recrop, setRecrop] = useState<Recrop | null>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  // products/{slug}/ plus the colour prefix, if the photo belongs to a colour,
  // or "carousel--" for carousel photos.
  function pathBase(id: string | null) {
    const color = colors.find((item) => item.id === id);
    const prefix = carousel
      ? "carousel--"
      : color
        ? `${color.color_slug}--`
        : "";
    return `products/${productSlug}/${prefix}`;
  }

  // Puts one file in Storage. False once the error is on screen.
  async function upload(path: string, blob: Blob) {
    const { error: uploadError } = await createClient()
      .storage.from(BUCKET)
      .upload(path, blob, { upsert: true, contentType: blob.type });

    if (uploadError) {
      setError(`Качването се провали: ${uploadError.message}`);
      return false;
    }
    return true;
  }

  // Best effort: clears files a failed save left behind.
  async function removeFiles(paths: string[]) {
    if (paths.length) await createClient().storage.from(BUCKET).remove(paths);
  }

  function handleFiles(files: FileList) {
    setError("");
    const id = carousel ? null : colorId || null;
    setQueue({
      files: Array.from(files),
      colorId: id,
      index: nextIndex(images, pathBase(id)),
      done: 0,
    });
  }

  function finishQueue() {
    setQueue(null);
    if (fileInput.current) fileInput.current.value = "";
    router.refresh();
  }

  function nextInQueue(current: Queue, uploaded: boolean) {
    const files = current.files.slice(1);
    if (files.length === 0) {
      finishQueue();
      return;
    }
    setQueue({
      ...current,
      files,
      index: uploaded ? current.index + 1 : current.index,
      done: current.done + 1,
    });
  }

  // Puts a library photo on this product, with its own tile: `choice` out of
  // `source` (what the cropper showed), or the library photo itself with
  // "Без изрязване". `scale` turns the crop into the library photo's pixels.
  // True if it worked; on failure the error is on screen and the tile just
  // uploaded is removed again.
  async function saveNew(
    photo: PhotoRef,
    source: Blob,
    choice: CropResult,
    colorId: string | null,
    index: number,
    scale: number,
  ) {
    let path = photo.path;
    let crop: CropRect | null = null;
    if (choice.mode === "crop") {
      const tile = await resizeToWebp(source, choice.crop, TILE_SIZE, PAGE_BG);
      if (tile.ext !== "webp") {
        setError(BAD_FORMAT);
        return false;
      }
      path = `${pathBase(colorId)}${fileNumber(index)}.webp`;
      if (!(await upload(path, tile.blob))) return false;
      crop = scaleCrop(choice.crop, scale);
    }

    let result: SaveResult;
    try {
      result = await attachImage({
        product_id: productId,
        color_id: colorId,
        in_carousel: carousel,
        photo_id: photo.id,
        path,
        crop,
        sort: index,
      });
    } catch {
      result = { ok: false, error: SAVE_FAILED };
    }
    if (!result.ok) {
      // No row points at the tile. The library photo stays either way.
      if (path !== photo.path) await removeFiles([path]);
      setError(result.error ?? SAVE_FAILED);
      return false;
    }
    return true;
  }

  // A new file goes into the library first, then onto the product.
  // Sequential, not all at once: each upload needs to know which index the
  // previous one took, and she's adding two or three photos, not two hundred.
  async function handleCropped(current: Queue, choice: CropResult) {
    const file = current.files[0];
    setBusy(`Качване на ${file.name}…`);

    const original = await uploadOriginal(file);
    let ok = false;
    if (!original.ok) {
      setError(original.error);
    } else {
      ok = await saveNew(original.photo, file, choice, current.colorId, current.index, original.scale);
      // The photo made it into the library; only this product's copy failed.
      if (!ok) setError((error) => `${error} Снимката остана в „Снимки“.`);
    }
    setBusy("");

    // On any failure, stop here — but still refresh so the ones that made it show.
    if (!ok) {
      finishQueue();
      return;
    }
    nextInQueue(current, true);
  }

  // A photo from the library: download it, then the same cropper as a new file.
  async function handlePick(photo: PhotoRef) {
    setPicking(false);
    setError("");
    setBusy("Зареждане на снимката…");
    const blob = await downloadOriginal(photo.path);
    setBusy("");
    if (!blob) {
      setError("Снимката не може да се зареди.");
      return;
    }
    const id = carousel ? null : colorId || null;
    setPicked({ photo, blob, colorId: id, index: nextIndex(images, pathBase(id)) });
  }

  async function handlePickedCropped(current: Picked, choice: CropResult) {
    setBusy("Запазване…");
    await saveNew(current.photo, current.blob, choice, current.colorId, current.index, 1);
    setBusy("");
    setPicked(null);
    router.refresh();
  }

  // Downloads the whole photo, not the tile, so a re-crop can widen the frame
  // again instead of only cutting more off.
  async function startRecrop(image: ProductImage) {
    setError("");
    setBusy("Зареждане на снимката…");
    try {
      const response = await fetch(imageUrl(fullImagePath(image)));
      if (!response.ok) throw new Error(String(response.status));
      setRecrop({ image, blob: await response.blob() });
    } catch {
      setError("Снимката не може да се зареди за изрязване.");
    }
    setBusy("");
  }

  // The new tile is saved under a new name rather than over the old file: the
  // old URL is cached by the browser and the CDN, so an overwrite would keep
  // showing the old framing for a while. The row keeps its place in the order,
  // and the whole photo is never touched.
  async function handleRecropped(current: Recrop, choice: CropResult) {
    setRecrop(null);
    const { image } = current;

    // "Без изрязване": point the tile at the whole photo; replaceImage drops
    // the old tile file but never the whole photo. An old photo has no whole
    // photo to go back to, and an uncropped one is already there.
    if (choice.mode === "original") {
      if (image.has_original === false || !image.full_path) {
        setError("Тази снимка няма оригинал — изтрийте я и я качете отново.");
        return;
      }
      if (image.path === image.full_path) return;
      setBusy("Запазване…");
      await saveReplace(image.id, image.full_path, null, false);
      return;
    }

    setBusy("Запазване…");
    const base = pathBase(image.color_id);
    const tile = await resizeToWebp(current.blob, choice.crop, TILE_SIZE, PAGE_BG);
    const path = `${base}${fileNumber(nextIndex(images, base))}.${tile.ext}`;
    if (!(await upload(path, tile.blob))) {
      setBusy("");
      return;
    }
    // An old photo has no whole photo (what was downloaded is its old tile),
    // so there is no full-photo crop to remember for it.
    const hasOriginal = image.has_original !== false && image.full_path != null;
    await saveReplace(image.id, path, hasOriginal ? choice.crop : null, true);
  }

  // Points a row at a new tile. With `removeOnFail`, `path` is a tile just
  // uploaded for it, removed again if the row still points at the old one.
  async function saveReplace(
    id: string,
    path: string,
    crop: CropRect | null,
    removeOnFail: boolean,
  ) {
    let result: SaveResult;
    try {
      result = await replaceImage(id, { path, crop });
    } catch {
      result = { ok: false, error: SAVE_FAILED };
    }
    setBusy("");

    if (!result.ok) {
      if (removeOnFail) await removeFiles([path]);
      setError(result.error ?? SAVE_FAILED);
      return;
    }
    router.refresh();
  }

  async function handleDelete(image: ProductImage) {
    setBusy("Изтриване…");
    const result = await deleteImage(image.id);
    setBusy("");

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  // Swaps a photo with its neighbour; only those two photos are saved.
  async function handleMove(from: number, to: number) {
    const first = images[Math.min(from, to)];
    const second = images[Math.max(from, to)];

    setError("");
    setBusy("Подреждане…");
    let result: SaveResult;
    try {
      result = await swapImageOrder(
        productId,
        { id: first.id, sort: first.sort },
        { id: second.id, sort: second.sort },
      );
    } catch {
      result = { ok: false, error: SAVE_FAILED };
    }
    setBusy("");

    if (!result.ok) setError(result.error ?? SAVE_FAILED);
    router.refresh();
  }

  function colorLabel(id: string | null) {
    if (!id) return "Всички цветове";
    return colors.find((color) => color.id === id)?.color_name ?? "—";
  }

  const locked =
    Boolean(busy) || Boolean(queue) || Boolean(recrop) || picking || Boolean(picked);
  const queueTotal = queue ? queue.done + queue.files.length : 0;

  return (
    // In carousel mode this sits inside the carousel panel, which has its own
    // card and heading.
    <section
      className={
        carousel ? "mt-5" : "rounded-card border border-border bg-surface p-5"
      }
    >
      {!carousel && (
        <>
          <h2 className="text-lg">Снимки</h2>
          <p className="mt-1 text-[0.85rem] text-muted">
            Качете снимка или добавете от „Снимки“, и я наместете в рамката —
            така ще изглежда в плочките на сайта. Цялата снимка се пази в
            „Снимки“, така че по-късно можете да я изрежете отново.
          </p>
        </>
      )}

      <div className={`${carousel ? "" : "mt-4 "}flex flex-wrap items-end gap-3`}>
        {!carousel && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.78rem] font-extrabold tracking-[0.08em] text-muted uppercase">
              За кой цвят е снимката
            </span>
            <select
              value={colorId}
              onChange={(event) => setColorId(event.target.value)}
              className="rounded-item border border-border-strong bg-bg px-3 py-2.5"
            >
              <option value="">Всички цветове</option>
              {colors.map((color) => (
                <option key={color.id} value={color.id}>
                  {color.color_name}
                </option>
              ))}
            </select>
          </label>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          disabled={locked}
          onChange={(event) => {
            if (event.target.files?.length) handleFiles(event.target.files);
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

      {images.length === 0 ? (
        <p className="mt-5 rounded-item border border-dashed border-border-strong px-4 py-6 text-center text-[0.9rem] text-muted">
          {carousel
            ? "Още няма снимки в карусела."
            : "Още няма снимки за този продукт."}
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => {
            const label = photoLabel(image);
            return (
              <li
                key={image.id}
                className="overflow-hidden rounded-item border border-border"
              >
                <div className="relative aspect-[4/5] bg-surface-2">
                  <Image
                    src={imageUrl(image.path)}
                    alt=""
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                  <PhotoViewer
                    src={imageUrl(fullImagePath(image))}
                    alt={
                      carousel
                        ? `Снимка ${index + 1} в карусела`
                        : `Снимка – ${colorLabel(image.color_id)}`
                    }
                  />
                  {label && (
                    <span className="absolute top-1.5 left-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[0.68rem] font-bold text-white">
                      {label}
                    </span>
                  )}
                  {carousel && (
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
                        disabled={locked || index === images.length - 1}
                        className={MOVE_BUTTON}
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 p-2">
                  {!carousel && (
                    <span className="mr-auto truncate text-[0.75rem] font-bold text-muted">
                      {colorLabel(image.color_id)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => startRecrop(image)}
                    disabled={locked}
                    className="ml-auto shrink-0 cursor-pointer text-[0.75rem] font-extrabold text-ink hover:underline disabled:opacity-50"
                  >
                    Изрежи
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(image)}
                    disabled={locked}
                    className="shrink-0 cursor-pointer text-[0.75rem] font-extrabold text-booked hover:underline disabled:opacity-50"
                  >
                    Махни
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Hidden while a photo uploads; the key gives each file a fresh frame. */}
      {queue && !busy && (
        <ImageCropper
          key={queue.done}
          source={queue.files[0]}
          title={
            queueTotal > 1
              ? `Изрежете снимката (${queue.done + 1} от ${queueTotal})`
              : "Изрежете снимката"
          }
          cancelLabel={queueTotal > 1 ? "Пропусни" : "Отказ"}
          onConfirm={(choice) => handleCropped(queue, choice)}
          onCancel={() => nextInQueue(queue, false)}
        />
      )}

      {picking && (
        <PhotoPicker
          title={carousel ? "Добави в карусела на продукта" : "Добави снимка на продукта"}
          filter="all"
          onCancel={() => setPicking(false)}
          onPick={([photo]) => (photo ? handlePick(photo) : setPicking(false))}
        />
      )}

      {picked && !busy && (
        <ImageCropper
          key={picked.photo.id}
          source={picked.blob}
          title="Изрежете снимката"
          cancelLabel="Отказ"
          onConfirm={(choice) => handlePickedCropped(picked, choice)}
          onCancel={() => setPicked(null)}
          onLoadError={() => {
            setPicked(null);
            setError("Снимката не може да се отвори за изрязване.");
          }}
        />
      )}

      {recrop && (
        <ImageCropper
          key={recrop.image.id}
          source={recrop.blob}
          initialCrop={recrop.image.crop ?? undefined}
          title="Изрежете снимката"
          cancelLabel="Отказ"
          onConfirm={(choice) => handleRecropped(recrop, choice)}
          onCancel={() => setRecrop(null)}
          onLoadError={() => {
            setRecrop(null);
            setError(
              "Тази снимка не може да се изреже — изтрийте я и я качете отново.",
            );
          }}
        />
      )}
    </section>
  );
}
