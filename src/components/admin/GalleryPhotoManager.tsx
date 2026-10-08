"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { centerCrop } from "@/lib/resize-image";
import { TILE_ASPECT } from "@/lib/images";
import { GALLERY_PAGE_SIZE, MAX_BULK } from "@/lib/gallery";
import type { GalleryPhoto, GalleryTag } from "@/lib/gallery";
import {
  addTagToGalleryPhotos,
  removeFromGallery,
  removeTagFromGalleryPhotos,
  replaceGalleryTile,
} from "@/app/admin/actions";
import {
  BAD_FORMAT,
  GALLERY_TILE_SIZE,
  SAVE_FAILED,
  addToGallery,
  downloadOriginal,
  makeTile,
  removeFiles,
  uploadOriginal,
} from "@/lib/upload-photo";
import ImageCropper from "@/components/admin/ImageCropper";
import type { CropResult } from "@/components/admin/ImageCropper";
import PhotoPicker from "@/components/admin/PhotoPicker";
import TagChip from "@/components/admin/TagChip";
import TagPicker from "@/components/admin/TagPicker";
import type { PhotoRef } from "@/lib/photo-library";

const CHIP =
  "cursor-pointer rounded-full border px-2.5 py-1 text-[0.75rem] font-extrabold transition-colors";
const CHIP_ON = "border-cta bg-cta text-white";
const CHIP_OFF = "border-border-strong bg-bg text-ink hover:border-cta";
const BAR_BUTTON =
  "cursor-pointer rounded-full px-3 py-1.5 text-[0.75rem] font-extrabold disabled:cursor-default disabled:opacity-50";

type Props = {
  tags: GalleryTag[];
  activeTag: GalleryTag | null;
  untagged: boolean;
  photos: GalleryPhoto[];
  hasMore: boolean;
  shown: number;
};

// A photo being re-framed, with its library photo downloaded for the cropper.
type Recrop = { photo: GalleryPhoto; original: PhotoRef; blob: Blob };

// Gallery photos. Their photos come from the library („Снимки“): upload a
// batch here (it lands in the library too) or add photos already there, with
// the tags picked for the batch (each tile cut from the middle of the photo,
// no framing step). Then per photo: its tags as chips (✕ removes, „+ Етикет“
// searches or creates one), „Изрежи“, „Махни“. „Избери“ switches to picking
// many photos and tagging or taking them out together. Newest first, like
// the site.
export default function GalleryPhotoManager({
  tags,
  activeTag,
  untagged,
  photos,
  hasMore,
  shown,
}: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [batchTagIds, setBatchTagIds] = useState<string[]>([]);
  const [recrop, setRecrop] = useState<Recrop | null>(null);
  const [picking, setPicking] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  // The tags for the next upload, looked up fresh each time: a tag deleted
  // meanwhile just drops out instead of breaking the upload.
  const batchTags = batchTagIds.flatMap((id) => tagById.get(id) ?? []);

  // Only photos still on the page count: after a delete or a filter change,
  // the old ids just drop out.
  const selected = photos.filter((photo) => selectedIds.includes(photo.id));
  // The tags at least one selected photo has: what „Махни етикет“ offers.
  const selectedTags = tags.filter((tag) =>
    selected.some((photo) => photo.tagIds.includes(tag.id)),
  );
  const unselectedTagIds = tags
    .filter((tag) => !selectedTags.includes(tag))
    .map((tag) => tag.id);
  // A bulk action takes at most MAX_BULK photos; „Избери всички“ stops there.
  const selectableCount = Math.min(photos.length, MAX_BULK);
  const tooMany = selected.length > MAX_BULK;

  // Uploads one file: into the library first, then into the gallery. Returns
  // true if it worked. If the second step fails the photo is still in
  // „Снимки“, so nothing is lost.
  async function uploadOne(file: File): Promise<boolean> {
    const original = await uploadOriginal(file);
    if (!original.ok) {
      setError(`${file.name}: ${original.error}`);
      return false;
    }
    const result = await addToGallery(
      original.photo,
      file,
      batchTags.map((tag) => tag.id),
      original.scale,
    );
    if (!result.ok) {
      setError(`${file.name}: ${result.error ?? SAVE_FAILED} Снимката остана в „Снимки“.`);
      return false;
    }
    return true;
  }

  // One after another, so the progress line is honest and a phone on mobile
  // data isn't pushing ten photos at once. Stops at the first failure; the
  // ones that made it still show.
  async function handleFiles(files: File[]) {
    setError("");
    for (const [index, file] of files.entries()) {
      setBusy(`Качване ${index + 1} от ${files.length}…`);
      if (!(await uploadOne(file))) break;
    }
    setBusy("");
    if (fileInput.current) fileInput.current.value = "";
    router.refresh();
  }

  // Photos picked from the library, one after another like an upload.
  async function handlePicked(picked: PhotoRef[]) {
    setPicking(false);
    setError("");
    for (const [index, photo] of picked.entries()) {
      setBusy(`Добавяне ${index + 1} от ${picked.length}…`);
      const blob = await downloadOriginal(photo.path);
      const result = blob
        ? await addToGallery(photo, blob, batchTags.map((tag) => tag.id))
        : { ok: false, error: "Снимката не може да се зареди." };
      if (!result.ok) {
        setError(result.error ?? SAVE_FAILED);
        break;
      }
    }
    setBusy("");
    router.refresh();
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
    return result.ok;
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

  // Downloads the library photo, not the tile, so a re-frame can widen the
  // frame again instead of only cutting more off.
  async function startRecrop(photo: GalleryPhoto, original: PhotoRef) {
    setError("");
    setBusy("Зареждане на снимката…");
    const blob = await downloadOriginal(original.path);
    if (blob) setRecrop({ photo, original, blob });
    else setError("Снимката не може да се зареди за изрязване.");
    setBusy("");
  }

  // The new tile is saved under a new name rather than over the old file: the
  // old URL is cached by the browser and the CDN, so an overwrite would keep
  // showing the old framing for a while. „Без изрязване“ goes back to the
  // middle of the photo, the way it was added.
  async function handleRecropped(current: Recrop, choice: CropResult) {
    setRecrop(null);
    setError("");
    setBusy("Запазване…");

    const crop =
      choice.mode === "crop" ? choice.crop : await centerCrop(current.blob, TILE_ASPECT);
    if (!crop) {
      setBusy("");
      setError(BAD_FORMAT);
      return;
    }
    const tile = await makeTile(current.original, current.blob, crop, "gallery", GALLERY_TILE_SIZE);
    if (!tile.ok) {
      setBusy("");
      setError(tile.error);
      return;
    }

    let result;
    try {
      result = await replaceGalleryTile(current.photo.id, { path: tile.path, crop: tile.crop });
    } catch {
      result = { ok: false as const, error: SAVE_FAILED };
    }
    if (!result.ok) {
      await removeFiles([tile.path]);
      setError(result.error);
    }
    setBusy("");
    router.refresh();
  }

  const locked = Boolean(busy) || Boolean(recrop) || picking;

  // Links for the list filter and „Покажи още“, keeping the other setting.
  function listHref(filter: { tag?: GalleryTag | null; untagged?: boolean }, count = GALLERY_PAGE_SIZE) {
    const params = new URLSearchParams();
    if (filter.tag) params.set("tag", filter.tag.slug);
    else if (filter.untagged) params.set("untagged", "1");
    if (count > GALLERY_PAGE_SIZE) params.set("shown", String(count));
    const query = params.toString();
    return query ? `/admin/gallery?${query}` : "/admin/gallery";
  }

  const emptyText = activeTag
    ? "Няма снимки с този етикет."
    : untagged
      ? "Всички снимки имат етикет."
      : "Още няма снимки в галерията.";

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="text-lg">Снимки</h2>
      <p className="mt-1 text-[0.85rem] text-muted">
        Изберете етикетите за новите снимки, после качете снимки или ги
        добавете от „Снимки“ — може много наведнъж. Всяка снимка се изрязва в
        рамка 4:5 от средата; ако рамката не стои добре, натиснете „Изрежи“
        под снимката.
      </p>

      {/* The tags every photo in the next upload gets. */}
      <div className="mt-4">
        <p className="text-[0.85rem] font-bold">Етикети за новите снимки</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {batchTags.map((tag) => (
            <TagChip
              key={tag.id}
              tag={tag}
              disabled={locked}
              onRemove={() => setBatchTagIds(batchTagIds.filter((id) => id !== tag.id))}
            />
          ))}
          <TagPicker
            tags={tags}
            excludeIds={batchTagIds}
            label="+ Етикет"
            disabled={locked}
            onPick={(tag) => setBatchTagIds([...batchTagIds, tag.id])}
            onError={setError}
          />
        </div>
      </div>

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
        className="mt-4 mr-3 cursor-pointer rounded-item border border-border-strong bg-bg px-3 py-2.5 text-[0.9rem] file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-cta file:px-4 file:py-1.5 file:font-extrabold file:text-white disabled:opacity-60"
      />

      <button
        type="button"
        onClick={() => setPicking(true)}
        disabled={locked}
        className="mt-4 cursor-pointer rounded-full border-[1.5px] border-ink px-4 py-2 text-[0.85rem] font-extrabold text-ink hover:border-cta hover:text-cta disabled:opacity-50"
      >
        + Добави от „Снимки“
      </button>

      {busy && <p className="mt-3 text-[0.85rem] font-bold text-muted">{busy}</p>}
      {error && (
        <p className="mt-3 rounded-item bg-booked/10 px-3 py-2 text-[0.85rem] font-bold text-booked">
          {error}
        </p>
      )}

      {/* Which photos the list below shows, and the switch to picking many. */}
      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        <Link
          href={listHref({})}
          className={`${CHIP} ${!activeTag && !untagged ? CHIP_ON : CHIP_OFF}`}
        >
          Всички
        </Link>
        <Link href={listHref({ untagged: true })} className={`${CHIP} ${untagged ? CHIP_ON : CHIP_OFF}`}>
          Без етикет
        </Link>
        {activeTag ? (
          <Link
            href={listHref({})}
            aria-label={`Махни филтъра ${activeTag.name}`}
            className={`${CHIP} ${CHIP_ON}`}
          >
            {activeTag.name} · {activeTag.count} ✕
          </Link>
        ) : (
          <TagPicker
            tags={tags}
            label="Филтър по етикет…"
            allowCreate={false}
            onPick={(tag) => router.push(listHref({ tag }))}
          />
        )}

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
          {emptyText}
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => {
            const isSelected = selectedIds.includes(photo.id);
            const photoTags = photo.tagIds.flatMap((id) => tagById.get(id) ?? []);
            return (
              <li
                key={photo.id}
                className={`overflow-hidden rounded-item border ${
                  isSelected ? "border-cta ring-2 ring-cta" : "border-border"
                }`}
              >
                <div className="relative aspect-[4/5] bg-surface-2">
                  <Image
                    src={photo.tileUrl}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 260px, (min-width: 640px) 33vw, 50vw"
                    className="object-cover"
                  />
                  {/* While picking, the whole photo is the checkbox. */}
                  {selecting && (
                    <label className="absolute inset-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(photo.id)}
                        aria-label="Избери снимката"
                        className="absolute top-2 left-2 h-5 w-5 cursor-pointer accent-cta"
                      />
                    </label>
                  )}
                </div>

                <div className="flex flex-col gap-2 p-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {photoTags.map((tag) => (
                      <TagChip
                        key={tag.id}
                        tag={tag}
                        disabled={locked || selecting}
                        onRemove={() =>
                          run("Запазване…", () => removeTagFromGalleryPhotos([photo.id], tag.id))
                        }
                      />
                    ))}
                    {!selecting && (
                      <TagPicker
                        tags={tags}
                        excludeIds={photo.tagIds}
                        label="+ Етикет"
                        disabled={locked}
                        onPick={(tag) =>
                          run("Запазване…", () => addTagToGalleryPhotos([photo.id], tag.id))
                        }
                        onError={setError}
                      />
                    )}
                  </div>
                  {!selecting && (
                    <div className="flex items-center justify-between">
                      {/* Rows not linked to the library yet have nothing to re-frame from. */}
                      {photo.photoId ? (
                        <button
                          type="button"
                          onClick={() =>
                            startRecrop(photo, { id: photo.photoId!, path: photo.fullPath })
                          }
                          disabled={locked}
                          className="cursor-pointer text-[0.75rem] font-extrabold text-cta hover:underline disabled:opacity-50"
                        >
                          Изрежи
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirm("Да махна тази снимка от галерията? Тя остава в „Снимки“.")) return;
                          run("Махане…", () => removeFromGallery([photo.id]));
                        }}
                        disabled={locked}
                        className="cursor-pointer text-[0.75rem] font-extrabold text-booked hover:underline disabled:opacity-50"
                      >
                        Махни
                      </button>
                    </div>
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
            href={listHref({ tag: activeTag, untagged }, shown + GALLERY_PAGE_SIZE)}
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
            <TagPicker
              tags={tags}
              label="+ Добави етикет"
              openUp
              disabled={locked || selected.length === 0 || tooMany}
              onPick={(tag) =>
                run(`Добавяне на „${tag.name}“…`, () =>
                  addTagToGalleryPhotos(selected.map((photo) => photo.id), tag.id),
                )
              }
              onError={setError}
            />
            <TagPicker
              tags={tags}
              excludeIds={unselectedTagIds}
              label="− Махни етикет"
              openUp
              allowCreate={false}
              minChars={0}
              disabled={locked || selectedTags.length === 0 || tooMany}
              onPick={(tag) =>
                run(`Махане на „${tag.name}“…`, () =>
                  removeTagFromGalleryPhotos(selected.map((photo) => photo.id), tag.id),
                )
              }
            />
            <button
              type="button"
              disabled={locked || selected.length === 0 || tooMany}
              onClick={async () => {
                const count = selected.length === 1 ? "1 снимка" : `${selected.length} снимки`;
                if (!confirm(`Да махна ${count} от галерията? Остават в „Снимки“.`)) return;
                if (await run("Махане…", () => removeFromGallery(selected.map((photo) => photo.id)))) {
                  setSelectedIds([]);
                }
              }}
              className={`${BAR_BUTTON} bg-booked text-white hover:opacity-90`}
            >
              Махни избраните
            </button>
          </div>
        </div>
      )}

      {picking && (
        <PhotoPicker
          title="Добави в галерията"
          filter="not-gallery"
          multiple
          onCancel={() => setPicking(false)}
          onPick={handlePicked}
        />
      )}

      {recrop && (
        <ImageCropper
          source={recrop.blob}
          initialCrop={recrop.photo.crop ?? undefined}
          title="Наместете снимката"
          cancelLabel="Отказ"
          onConfirm={(choice) => handleRecropped(recrop, choice)}
          onCancel={() => setRecrop(null)}
          onLoadError={() => {
            setRecrop(null);
            setError("Снимката не може да се отвори за изрязване.");
          }}
        />
      )}
    </section>
  );
}
