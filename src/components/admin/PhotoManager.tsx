"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resizeToWebp } from "@/lib/resize-image";
import type { CropRect } from "@/lib/resize-image";
import { imageUrl } from "@/lib/images";
import { attachImage, deleteImage, replaceImage } from "@/app/admin/actions";
import ImageCropper from "@/components/admin/ImageCropper";
import type { ProductColor, ProductImage } from "@/lib/types";

const BUCKET = "catalog";

type Props = {
  productId: string;
  productSlug: string;
  colors: ProductColor[];
  images: ProductImage[];
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

// An existing photo being re-cropped, already downloaded.
type Recrop = { image: ProductImage; blob: Blob };

// The next NN for products/{slug}/{prefix}NN.ext. Scanning the paths we already
// have beats counting rows: deleting photo 02 of three shouldn't make the next
// upload collide with 03.
function nextIndex(images: ProductImage[], base: string) {
  let max = 0;
  for (const image of images) {
    if (!image.path.startsWith(base)) continue;
    const index = parseInt(image.path.slice(base.length), 10);
    if (Number.isFinite(index) && index > max) max = index;
  }
  return max + 1;
}

export default function PhotoManager({
  productId,
  productSlug,
  colors,
  images,
}: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [colorId, setColorId] = useState("");
  const [queue, setQueue] = useState<Queue | null>(null);
  const [recrop, setRecrop] = useState<Recrop | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  // products/{slug}/ plus the colour prefix, if the photo belongs to a colour.
  function pathBase(id: string | null) {
    const color = colors.find((item) => item.id === id);
    const prefix = color ? `${color.color_slug}--` : "";
    return `products/${productSlug}/${prefix}`;
  }

  // Shrinks (and crops) the photo and puts it in Storage. Returns the path, or
  // null once the error is on screen.
  async function uploadPhoto(
    source: Blob,
    crop: CropRect | null,
    base: string,
    index: number,
  ) {
    const { blob, ext } = await resizeToWebp(source, crop ?? undefined);
    const path = `${base}${String(index).padStart(2, "0")}.${ext}`;

    const { error: uploadError } = await createClient()
      .storage.from(BUCKET)
      .upload(path, blob, { upsert: true, contentType: blob.type });

    if (uploadError) {
      setError(`Качването се провали: ${uploadError.message}`);
      return null;
    }
    return path;
  }

  function handleFiles(files: FileList) {
    setError("");
    const id = colorId || null;
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

  // Sequential, not all at once: each upload needs to know which index the
  // previous one took, and she's adding two or three photos, not two hundred.
  async function handleCropped(current: Queue, crop: CropRect | null) {
    const file = current.files[0];
    setBusy(`Качване на ${file.name}…`);

    const path = await uploadPhoto(
      file,
      crop,
      pathBase(current.colorId),
      current.index,
    );
    const result = path
      ? await attachImage({
          product_id: productId,
          color_id: current.colorId,
          path,
          sort: current.index,
        })
      : null;

    setBusy("");
    if (result && !result.ok) setError(result.error);

    // On any failure, stop here — but still refresh so the ones that made it show.
    if (!result?.ok) {
      finishQueue();
      return;
    }
    nextInQueue(current, true);
  }

  async function startRecrop(image: ProductImage) {
    setError("");
    setBusy("Зареждане на снимката…");
    try {
      const response = await fetch(imageUrl(image.path));
      if (!response.ok) throw new Error(String(response.status));
      setRecrop({ image, blob: await response.blob() });
    } catch {
      setError("Снимката не може да се зареди за изрязване.");
    }
    setBusy("");
  }

  // Saved under a new name rather than over the old file: the old URL is
  // cached by the browser and the CDN, so an overwrite would keep showing the
  // old framing for a while. The row keeps its place in the order.
  async function handleRecropped(current: Recrop, crop: CropRect | null) {
    setRecrop(null);
    if (!crop) {
      setError("Тази снимка не може да се изреже — изтрийте я и я качете отново.");
      return;
    }

    setBusy("Запазване…");
    const base = pathBase(current.image.color_id);
    const path = await uploadPhoto(current.blob, crop, base, nextIndex(images, base));
    const result = path ? await replaceImage(current.image.id, path) : null;
    setBusy("");

    if (path && result && !result.ok) {
      // The row still points at the old file, so the new one is unused.
      await createClient().storage.from(BUCKET).remove([path]);
      setError(result.error);
    }
    if (result?.ok) router.refresh();
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

  function colorLabel(id: string | null) {
    if (!id) return "Всички цветове";
    return colors.find((color) => color.id === id)?.color_name ?? "—";
  }

  const locked = Boolean(busy) || Boolean(queue) || Boolean(recrop);
  const queueTotal = queue ? queue.done + queue.files.length : 0;

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="text-lg">Снимки</h2>
      <p className="mt-1 text-[0.85rem] text-muted">
        Изберете снимка и нагласете рамката върху нея — така ще изглежда в
        плочките на сайта. Файлът се преоразмерява и преименува автоматично.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
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
      </div>

      {busy && <p className="mt-3 text-[0.85rem] font-bold text-muted">{busy}</p>}
      {error && (
        <p className="mt-3 rounded-item bg-booked/10 px-3 py-2 text-[0.85rem] font-bold text-booked">
          {error}
        </p>
      )}

      {images.length === 0 ? (
        <p className="mt-5 rounded-item border border-dashed border-border-strong px-4 py-6 text-center text-[0.9rem] text-muted">
          Още няма снимки за този продукт.
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image) => (
            <li
              key={image.id}
              className="overflow-hidden rounded-item border border-border"
            >
              <div className="relative aspect-[4/3] bg-surface-2">
                <Image
                  src={imageUrl(image.path)}
                  alt=""
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              </div>
              <div className="flex items-center gap-2 p-2">
                <span className="mr-auto truncate text-[0.75rem] font-bold text-muted">
                  {colorLabel(image.color_id)}
                </span>
                <button
                  type="button"
                  onClick={() => startRecrop(image)}
                  disabled={locked}
                  className="shrink-0 cursor-pointer text-[0.75rem] font-extrabold text-ink hover:underline disabled:opacity-50"
                >
                  Изрежи
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(image)}
                  disabled={locked}
                  className="shrink-0 cursor-pointer text-[0.75rem] font-extrabold text-booked hover:underline disabled:opacity-50"
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
              ? `Изрежете снимката (${queue.done + 1} от ${queueTotal})`
              : "Изрежете снимката"
          }
          cancelLabel={queueTotal > 1 ? "Пропусни" : "Отказ"}
          onConfirm={(crop) => handleCropped(queue, crop)}
          onCancel={() => nextInQueue(queue, false)}
        />
      )}

      {recrop && (
        <ImageCropper
          key={recrop.image.id}
          source={recrop.blob}
          title="Изрежете снимката"
          cancelLabel="Отказ"
          onConfirm={(crop) => handleRecropped(recrop, crop)}
          onCancel={() => setRecrop(null)}
        />
      )}
    </section>
  );
}
