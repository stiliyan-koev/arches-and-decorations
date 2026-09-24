"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resizeToWebp } from "@/lib/resize-image";
import { imageUrl } from "@/lib/images";
import { attachImage, deleteImage } from "@/app/admin/actions";
import type { ProductColor, ProductImage } from "@/lib/types";

const BUCKET = "catalog";

type Props = {
  productId: string;
  productSlug: string;
  colors: ProductColor[];
  images: ProductImage[];
};

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
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function handleFiles(files: FileList) {
    setError("");
    const supabase = createClient();
    const color = colors.find((item) => item.id === colorId) ?? null;
    const prefix = color ? `${color.color_slug}--` : "";
    const base = `products/${productSlug}/${prefix}`;

    // Sequential, not Promise.all: each upload needs to know which indices the
    // previous one took, and she's adding two or three photos, not two hundred.
    let index = nextIndex(images, base);

    for (const file of Array.from(files)) {
      setBusy(`Качване на ${file.name}…`);

      const { blob, ext } = await resizeToWebp(file);
      const path = `${base}${String(index).padStart(2, "0")}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { upsert: true, contentType: blob.type });

      if (uploadError) {
        setError(`Качването се провали: ${uploadError.message}`);
        setBusy("");
        return;
      }

      const result = await attachImage({
        product_id: productId,
        color_id: color?.id ?? null,
        path,
        sort: index,
      });

      if (!result.ok) {
        setError(result.error);
        setBusy("");
        return;
      }

      index += 1;
    }

    setBusy("");
    if (fileInput.current) fileInput.current.value = "";
    router.refresh();
  }

  async function handleDelete(image: ProductImage) {
    setBusy("Изтриване…");
    const result = await deleteImage(image.id, image.path);
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

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="text-lg">Снимки</h2>
      <p className="mt-1 text-[0.85rem] text-muted">
        Файлът се преоразмерява и преименува автоматично — просто изберете
        снимка.
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
          disabled={Boolean(busy)}
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
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="truncate text-[0.75rem] font-bold text-muted">
                  {colorLabel(image.color_id)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(image)}
                  disabled={Boolean(busy)}
                  className="shrink-0 cursor-pointer text-[0.75rem] font-extrabold text-booked hover:underline disabled:opacity-50"
                >
                  Изтрий
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
