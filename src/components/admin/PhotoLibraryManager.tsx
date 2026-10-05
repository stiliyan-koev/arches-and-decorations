"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LIBRARY_FILTERS, LIBRARY_PAGE_SIZE, usageText } from "@/lib/photo-library";
import type { LibraryFilter, LibraryPhoto, PhotoRef } from "@/lib/photo-library";
import { MAX_BULK } from "@/lib/gallery";
import type { GalleryTag } from "@/lib/gallery";
import {
  addTagToGalleryPhotos,
  deletePhotos,
  removeFromGallery,
  removeHeroPhoto,
  removeTagFromGalleryPhotos,
} from "@/app/admin/actions";
import {
  SAVE_FAILED,
  addToCarousel,
  addToGallery,
  downloadOriginal,
  uploadOriginal,
} from "@/lib/upload-photo";
import type { SaveResult } from "@/lib/upload-photo";
import PhotoViewer from "@/components/PhotoViewer";
import ImageCropper from "@/components/admin/ImageCropper";
import type { CropResult } from "@/components/admin/ImageCropper";
import TagChip from "@/components/admin/TagChip";
import TagPicker from "@/components/admin/TagPicker";

const CHIP =
  "cursor-pointer rounded-full border px-2.5 py-1 text-[0.75rem] font-extrabold transition-colors disabled:cursor-default disabled:opacity-50";
const CHIP_ON = "border-cta bg-cta text-white";
const CHIP_OFF = "border-border-strong bg-bg text-ink hover:border-cta";
const BAR_BUTTON =
  "cursor-pointer rounded-full px-3 py-1.5 text-[0.75rem] font-extrabold disabled:cursor-default disabled:opacity-50";

type Props = {
  photos: LibraryPhoto[];
  total: number;
  hasMore: boolean;
  filter: LibraryFilter;
  shown: number;
  tags: GalleryTag[];
};

// A library photo being framed for the carousel, downloaded for the cropper.
type Framing = { photo: PhotoRef; blob: Blob };

// The photo library: every photo on the site, once. Upload here (no framing
// step), then per photo switch where it shows: „Карусел“ frames it for the
// homepage strip (it joins the end; order it on „Начална страница“),
// „Галерия“ puts it in the gallery. Tags are the gallery's filters, so giving
// a photo a tag puts it in the gallery too. Products that use it are listed;
// add a photo to a product from the product's page. „Изтрий“ removes it from
// everywhere. Newest first.
export default function PhotoLibraryManager({
  photos,
  total,
  hasMore,
  filter,
  shown,
  tags,
}: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [framing, setFraming] = useState<Framing | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  // Only photos still on the page count: after a delete or a filter change,
  // the old ids just drop out.
  const selected = photos.filter((photo) => selectedIds.includes(photo.id));
  const selectableCount = Math.min(photos.length, MAX_BULK);
  const tooMany = selected.length > MAX_BULK;

  // Runs one save action with the busy message, then reloads the list.
  async function run(message: string, action: () => Promise<SaveResult>) {
    setError("");
    setBusy(message);
    let result: SaveResult;
    try {
      result = await action();
    } catch {
      result = { ok: false, error: SAVE_FAILED };
    }
    setBusy("");
    if (!result.ok) setError(result.error ?? SAVE_FAILED);
    router.refresh();
    return result.ok;
  }

  // One after another, so the progress line is honest and a phone on mobile
  // data isn't pushing ten photos at once. Stops at the first failure; the
  // ones that made it still show.
  async function handleFiles(files: File[]) {
    setError("");
    for (const [index, file] of files.entries()) {
      setBusy(`Качване ${index + 1} от ${files.length}…`);
      const result = await uploadOriginal(file);
      if (!result.ok) {
        setError(`${file.name}: ${result.error}`);
        break;
      }
    }
    setBusy("");
    if (fileInput.current) fileInput.current.value = "";
    router.refresh();
  }

  // „Карусел“ switched on: download the photo and open the cropper. The
  // carousel shows a 4:5 frame, so she sets it here.
  async function startCarousel(photo: LibraryPhoto) {
    setError("");
    setBusy("Зареждане на снимката…");
    const blob = await downloadOriginal(photo.path);
    setBusy("");
    if (blob) setFraming({ photo: { id: photo.id, path: photo.path }, blob });
    else setError("Снимката не може да се зареди.");
  }

  async function handleFramed(current: Framing, choice: CropResult) {
    setFraming(null);
    await run("Добавяне в карусела…", () =>
      addToCarousel(current.photo, current.blob, choice),
    );
  }

  function toggleCarousel(photo: LibraryPhoto) {
    if (!photo.heroId) {
      startCarousel(photo);
      return;
    }
    const heroId = photo.heroId;
    if (!confirm("Да махна снимката от карусела? Тя остава тук.")) return;
    run("Махане от карусела…", () => removeHeroPhoto(heroId));
  }

  // „Галерия“ switched on (or a first tag given): no framing step, the tile
  // is the middle of the photo (re-frame it on „Галерия“ with „Изрежи“).
  async function addOneToGallery(photo: LibraryPhoto, tagIds: string[] = []): Promise<SaveResult> {
    const blob = await downloadOriginal(photo.path);
    if (!blob) return { ok: false, error: "Снимката не може да се зареди." };
    return addToGallery({ id: photo.id, path: photo.path }, blob, tagIds);
  }

  // A tag is a gallery filter: on a photo not in the gallery yet, it puts the
  // photo there with that tag.
  function addTag(photo: LibraryPhoto, tag: GalleryTag) {
    const gallery = photo.gallery;
    if (gallery) {
      run("Запазване…", () => addTagToGalleryPhotos([gallery.id], tag.id));
    } else {
      run("Добавяне в галерията…", () => addOneToGallery(photo, [tag.id]));
    }
  }

  function toggleGallery(photo: LibraryPhoto) {
    if (!photo.gallery) {
      run("Добавяне в галерията…", () => addOneToGallery(photo));
      return;
    }
    const galleryId = photo.gallery.id;
    const warning = photo.gallery.tagIds.length
      ? "Да махна снимката от галерията? Етикетите ѝ се махат с нея; снимката остава тук."
      : "Да махна снимката от галерията? Тя остава тук.";
    if (!confirm(warning)) return;
    run("Махане от галерията…", () => removeFromGallery([galleryId]));
  }

  function handleDelete(photo: LibraryPhoto) {
    const usage = usageText(photo);
    const message = usage
      ? `Тази снимка се използва в: ${usage}.\n\nДа я изтрия оттам и оттук? Това не може да се върне.`
      : "Да изтрия тази снимка? Това не може да се върне.";
    if (!confirm(message)) return;
    run("Изтриване…", () => deletePhotos([photo.id]));
  }

  // Adds every selected photo that isn't in the gallery yet, one by one.
  async function addSelectedToGallery() {
    const missing = selected.filter((photo) => !photo.gallery);
    setError("");
    for (const [index, photo] of missing.entries()) {
      setBusy(`Добавяне в галерията ${index + 1} от ${missing.length}…`);
      const result = await addOneToGallery(photo);
      if (!result.ok) {
        setError(result.error ?? SAVE_FAILED);
        break;
      }
    }
    setBusy("");
    router.refresh();
  }

  async function deleteSelected() {
    const used = selected.filter((photo) => usageText(photo)).length;
    const count = selected.length === 1 ? "1 снимка" : `${selected.length} снимки`;
    const message = used
      ? `Да изтрия ${count}? ${used} от тях се използват на сайта и ще изчезнат и оттам. Това не може да се върне.`
      : `Да изтрия ${count}? Това не може да се върне.`;
    if (!confirm(message)) return;
    if (await run("Изтриване…", () => deletePhotos(selected.map((photo) => photo.id)))) {
      setSelectedIds([]);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds(
      selectedIds.includes(id) ? selectedIds.filter((other) => other !== id) : [...selectedIds, id],
    );
  }

  function stopSelecting() {
    setSelecting(false);
    setSelectedIds([]);
  }

  // Links for the filter chips and „Покажи още“, keeping the other setting.
  function listHref(value: LibraryFilter, count = LIBRARY_PAGE_SIZE) {
    const params = new URLSearchParams();
    if (value !== "all") params.set("filter", value);
    if (count > LIBRARY_PAGE_SIZE) params.set("shown", String(count));
    const query = params.toString();
    return query ? `/admin/photos?${query}` : "/admin/photos";
  }

  const locked = Boolean(busy) || Boolean(framing);

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="text-lg">Качване</h2>
      <p className="mt-1 text-[0.85rem] text-muted">
        Може много снимки наведнъж. Пазят се цели (само смалени), а всяко място
        изрязва своята рамка от тях.
      </p>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        disabled={locked}
        onChange={(event) => {
          const files = event.target.files;
          if (files?.length) handleFiles(Array.from(files));
        }}
        className="mt-4 cursor-pointer rounded-item border border-border-strong bg-bg px-3 py-2.5 text-[0.9rem] file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-cta file:px-4 file:py-1.5 file:font-extrabold file:text-white disabled:opacity-60"
      />

      {busy && <p className="mt-3 text-[0.85rem] font-bold text-muted">{busy}</p>}
      {error && (
        <p className="mt-3 rounded-item bg-booked/10 px-3 py-2 text-[0.85rem] font-bold text-booked">
          {error}
        </p>
      )}

      {/* Which photos the grid shows, and the switch to picking many. */}
      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        {LIBRARY_FILTERS.map((item) => (
          <Link
            key={item.value}
            href={listHref(item.value)}
            className={`${CHIP} ${filter === item.value ? CHIP_ON : CHIP_OFF}`}
          >
            {item.label}
          </Link>
        ))}
        <span className="ml-1 text-[0.8rem] font-bold text-muted tabular-nums">
          {total === 1 ? "1 снимка" : `${total} снимки`}
        </span>

        {photos.length > 0 && (
          <button
            type="button"
            onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
            disabled={locked}
            className={`ml-auto ${CHIP} ${selecting ? CHIP_ON : CHIP_OFF}`}
          >
            {selecting ? "Готово" : "Избери снимки"}
          </button>
        )}
      </div>

      {photos.length === 0 ? (
        <p className="mt-5 rounded-item border border-dashed border-border-strong px-4 py-6 text-center text-[0.9rem] text-muted">
          {filter === "all" ? "Още няма снимки." : "Няма снимки тук."}
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => {
            const isSelected = selectedIds.includes(photo.id);
            const photoTags = (photo.gallery?.tagIds ?? []).flatMap(
              (id) => tagById.get(id) ?? [],
            );
            return (
              <li
                key={photo.id}
                className={`flex flex-col overflow-hidden rounded-item border ${
                  isSelected ? "border-cta ring-2 ring-cta" : "border-border"
                }`}
              >
                <div className="relative aspect-[4/5] bg-surface-2">
                  <Image
                    src={photo.url}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 260px, (min-width: 640px) 33vw, 50vw"
                    className="object-cover"
                  />
                  {!photo.hasOriginal && (
                    <span className="absolute top-1.5 left-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[0.68rem] font-bold text-white">
                      Няма оригинал
                    </span>
                  )}
                  {selecting ? (
                    // While picking, the whole photo is the checkbox.
                    <label className="absolute inset-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(photo.id)}
                        aria-label="Избери снимката"
                        className="absolute top-2 left-2 h-5 w-5 cursor-pointer accent-cta"
                      />
                    </label>
                  ) : (
                    <PhotoViewer src={photo.url} alt="Снимка от библиотеката" />
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-2">
                  {/* Where the photo shows. A press switches it on or off. */}
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => toggleCarousel(photo)}
                      disabled={locked || selecting}
                      aria-pressed={Boolean(photo.heroId)}
                      className={`${CHIP} ${photo.heroId ? CHIP_ON : CHIP_OFF}`}
                    >
                      {photo.heroId ? "✓ Карусел" : "+ Карусел"}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleGallery(photo)}
                      disabled={locked || selecting}
                      aria-pressed={Boolean(photo.gallery)}
                      className={`${CHIP} ${photo.gallery ? CHIP_ON : CHIP_OFF}`}
                    >
                      {photo.gallery ? "✓ Галерия" : "+ Галерия"}
                    </button>
                  </div>

                  {/* Its gallery tags, the same chips as on „Галерия“. */}
                  <div className="flex flex-wrap items-center gap-1">
                    {photoTags.map((tag) => (
                      <TagChip
                        key={tag.id}
                        tag={tag}
                        disabled={locked || selecting}
                        onRemove={() =>
                          run("Запазване…", () =>
                            removeTagFromGalleryPhotos([photo.gallery!.id], tag.id),
                          )
                        }
                      />
                    ))}
                    {!selecting && (
                      <TagPicker
                        tags={tags}
                        excludeIds={photo.gallery?.tagIds ?? []}
                        label="+ Етикет"
                        disabled={locked}
                        onPick={(tag) => addTag(photo, tag)}
                        onError={setError}
                      />
                    )}
                  </div>

                  {photo.products.length > 0 && (
                    <ul className="flex flex-col gap-0.5 text-[0.75rem] font-bold text-muted">
                      {photo.products.map((product) => (
                        <li key={product.id} className="truncate">
                          Продукт:{" "}
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="text-ink hover:text-cta hover:underline"
                          >
                            {product.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}

                  {!selecting && (
                    <button
                      type="button"
                      onClick={() => handleDelete(photo)}
                      disabled={locked}
                      className="mt-auto ml-auto cursor-pointer text-[0.75rem] font-extrabold text-booked hover:underline disabled:opacity-50"
                    >
                      Изтрий
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <div className="mt-5 flex justify-center">
          <Link
            href={listHref(filter, shown + LIBRARY_PAGE_SIZE)}
            scroll={false}
            className="rounded-full border-[1.5px] border-ink px-5 py-2 text-[0.9rem] font-extrabold text-ink hover:border-cta hover:text-cta"
          >
            Покажи още
          </Link>
        </div>
      )}

      {/* What to do with the picked photos. Stays at the bottom of the screen
          while she scrolls through the grid. */}
      {selecting && (
        <div className="sticky bottom-4 z-10 mt-5 flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface px-4 py-3 shadow-[0_8px_28px_rgb(59_47_66/0.22)]">
          <span className="text-[0.85rem] font-extrabold tabular-nums">
            Избрани: {selected.length}
          </span>
          <button
            type="button"
            onClick={() =>
              setSelectedIds(
                selected.length >= selectableCount
                  ? []
                  : photos.slice(0, MAX_BULK).map((photo) => photo.id),
              )
            }
            disabled={locked}
            className={`${BAR_BUTTON} text-cta hover:underline`}
          >
            {selected.length >= selectableCount ? "Изчисти" : `Избери всички (${selectableCount})`}
          </button>
          {tooMany && (
            <span className="text-[0.8rem] font-bold text-booked">
              Най-много {MAX_BULK} снимки наведнъж.
            </span>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addSelectedToGallery}
              disabled={locked || tooMany || !selected.some((photo) => !photo.gallery)}
              className={`${BAR_BUTTON} border border-border-strong text-ink hover:border-cta`}
            >
              + Добави в галерията
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              disabled={locked || selected.length === 0 || tooMany}
              className={`${BAR_BUTTON} bg-booked text-white hover:opacity-90`}
            >
              Изтрий избраните
            </button>
          </div>
        </div>
      )}

      {framing && (
        <ImageCropper
          source={framing.blob}
          title="Наместете снимката за карусела"
          cancelLabel="Отказ"
          onConfirm={(choice) => handleFramed(framing, choice)}
          onCancel={() => setFraming(null)}
          onLoadError={() => {
            setFraming(null);
            setError("Снимката не може да се отвори за изрязване.");
          }}
        />
      )}
    </section>
  );
}
