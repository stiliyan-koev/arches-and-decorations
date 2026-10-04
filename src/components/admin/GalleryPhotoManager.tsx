"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { centerCrop, resizeToWebp } from "@/lib/resize-image";
import { PAGE_BG, TILE_ASPECT } from "@/lib/images";
import { GALLERY_PAGE_SIZE, MAX_BULK } from "@/lib/gallery";
import type { GalleryPhoto, GalleryTag } from "@/lib/gallery";
import {
  addGalleryPhoto,
  addTagToGalleryPhotos,
  deleteGalleryPhotos,
  removeTagFromGalleryPhotos,
  replaceGalleryTile,
} from "@/app/admin/actions";
import ImageCropper from "@/components/admin/ImageCropper";
import type { CropResult } from "@/components/admin/ImageCropper";
import TagPicker from "@/components/admin/TagPicker";

const BUCKET = "catalog";
const SAVE_FAILED = "Запазването се провали. Опитайте отново.";
const BAD_FORMAT =
  "Този формат не може да се обработи. Запазете снимката като JPG и опитайте отново.";

// The grid shows tiles at most ~400px wide, so 1000px tall is sharp on any
// screen. The whole photo is for the full-screen viewer, like product photos.
const TILE_SIZE = 1000;
const FULL_SIZE = 2000;

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

// A photo being re-framed, with its whole photo downloaded for the cropper.
type Recrop = { photo: GalleryPhoto; blob: Blob };

// Gallery photos. Upload a batch with the tags picked for it (each tile cut
// from the middle of the photo, no framing step). Then per photo: its tags as
// chips (✕ removes, „+ Етикет“ searches or creates one), „Изрежи“, „Изтрий“.
// „Избери“ switches to picking many photos and tagging or deleting them
// together. Newest first, like the site.
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
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const storage = () => createClient().storage.from(BUCKET);
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

  // Uploads one file. Returns true if it worked; on failure the files it
  // already put in Storage are removed again (no row points at them).
  async function uploadOne(file: File): Promise<boolean> {
    const full = await resizeToWebp(file, undefined, FULL_SIZE);
    // The server only accepts .webp paths; a format the browser can't redraw
    // comes back as the original file.
    if (full.ext !== "webp") {
      setError(`${file.name}: ${BAD_FORMAT}`);
      return false;
    }
    const tile = await resizeToWebp(
      file,
      await centerCrop(file, TILE_ASPECT),
      TILE_SIZE,
      PAGE_BG,
    );

    // One random name for both files, so a photo's tile and whole photo are
    // easy to pair up in Storage.
    const name = crypto.randomUUID();
    const path = `gallery/${name}.webp`;
    const fullPath = `gallery/full/${name}.webp`;
    const uploaded: string[] = [];

    for (const [target, blob] of [
      [fullPath, full.blob],
      [path, tile.blob],
    ] as const) {
      const { error: uploadError } = await storage().upload(target, blob, {
        contentType: blob.type,
      });
      if (uploadError) {
        await storage().remove(uploaded);
        setError(`${file.name}: качването се провали: ${uploadError.message}`);
        return false;
      }
      uploaded.push(target);
    }

    let result;
    try {
      result = await addGalleryPhoto({
        path,
        fullPath,
        tagIds: batchTags.map((tag) => tag.id),
      });
    } catch {
      result = { ok: false as const, error: SAVE_FAILED };
    }
    if (!result.ok) {
      // keepFiles: the row is still there and points at the files.
      if (!("keepFiles" in result)) await storage().remove(uploaded);
      setError(`${file.name}: ${result.error}`);
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
      let ok;
      try {
        ok = await uploadOne(file);
      } catch {
        setError(`${file.name}: ${SAVE_FAILED}`);
        ok = false;
      }
      if (!ok) break;
    }
    setBusy("");
    if (fileInput.current) fileInput.current.value = "";
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

  // Downloads the whole photo, not the tile, so a re-frame can widen the
  // frame again instead of only cutting more off.
  async function startRecrop(photo: GalleryPhoto) {
    setError("");
    setBusy("Зареждане на снимката…");
    try {
      const response = await fetch(photo.fullUrl);
      if (!response.ok) throw new Error(String(response.status));
      setRecrop({ photo, blob: await response.blob() });
    } catch {
      setError("Снимката не може да се зареди за изрязване.");
    }
    setBusy("");
  }

  // The new tile is saved under a new name rather than over the old file: the
  // old URL is cached by the browser and the CDN, so an overwrite would keep
  // showing the old framing for a while. „Без изрязване“ goes back to the
  // middle of the photo, the way it was uploaded.
  async function handleRecropped(current: Recrop, choice: CropResult) {
    setRecrop(null);
    setError("");
    setBusy("Запазване…");

    const crop =
      choice.mode === "crop" ? choice.crop : await centerCrop(current.blob, TILE_ASPECT);
    const tile = await resizeToWebp(current.blob, crop, TILE_SIZE, PAGE_BG);
    if (tile.ext !== "webp") {
      setBusy("");
      setError(BAD_FORMAT);
      return;
    }

    const path = `gallery/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await storage().upload(path, tile.blob, {
      contentType: tile.blob.type,
    });
    if (uploadError) {
      setBusy("");
      setError(`Качването се провали: ${uploadError.message}`);
      return;
    }

    let result;
    try {
      result = await replaceGalleryTile(current.photo.id, path);
    } catch {
      result = { ok: false as const, error: SAVE_FAILED };
    }
    if (!result.ok) {
      await storage().remove([path]);
      setError(result.error);
    }
    setBusy("");
    router.refresh();
  }

  const locked = Boolean(busy) || Boolean(recrop);

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
        Изберете етикетите за новите снимки, после самите снимки — може много
        наведнъж. Всяка снимка се изрязва в рамка 4:5 от средата; ако рамката
        не стои добре, натиснете „Изрежи“ под снимката.
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
        className="mt-4 cursor-pointer rounded-item border border-border-strong bg-bg px-3 py-2.5 text-[0.9rem] file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-cta file:px-4 file:py-1.5 file:font-extrabold file:text-white disabled:opacity-60"
      />

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
                      <button
                        type="button"
                        onClick={() => startRecrop(photo)}
                        disabled={locked}
                        className="cursor-pointer text-[0.75rem] font-extrabold text-cta hover:underline disabled:opacity-50"
                      >
                        Изрежи
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirm("Да изтрия тази снимка от галерията?")) return;
                          run("Изтриване…", () => deleteGalleryPhotos([photo.id]));
                        }}
                        disabled={locked}
                        className="cursor-pointer text-[0.75rem] font-extrabold text-booked hover:underline disabled:opacity-50"
                      >
                        Изтрий
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
                if (!confirm(`Да изтрия ${count} от галерията? Това не може да се върне.`)) return;
                if (await run("Изтриване…", () => deleteGalleryPhotos(selected.map((photo) => photo.id)))) {
                  setSelectedIds([]);
                }
              }}
              className={`${BAR_BUTTON} bg-booked text-white hover:opacity-90`}
            >
              Изтрий избраните
            </button>
          </div>
        </div>
      )}

      {recrop && (
        <ImageCropper
          source={recrop.blob}
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

// A tag on a photo (or on the next upload), with ✕ to take it off.
function TagChip({
  tag,
  disabled,
  onRemove,
}: {
  tag: GalleryTag;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cta/10 py-0.5 pr-1 pl-2.5 text-[0.75rem] font-extrabold text-cta">
      {tag.name}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Махни етикета ${tag.name}`}
        className="grid h-5 w-5 cursor-pointer place-items-center rounded-full hover:bg-cta hover:text-white disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-cta"
      >
        ✕
      </button>
    </span>
  );
}
