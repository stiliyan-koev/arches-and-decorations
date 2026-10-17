import { createClient } from "@/lib/supabase/client";
import { centerCrop, resizeToWebp, scaleCrop } from "@/lib/resize-image";
import type { CropRect } from "@/lib/resize-image";
import { PAGE_BG, TILE_ASPECT, imageUrl } from "@/lib/images";
import { addGalleryPhoto, addHeroPhoto, addPhoto } from "@/app/admin/actions";
import type { CropResult } from "@/components/admin/ImageCropper";
import type { PhotoRef } from "@/lib/photo-library";

// Browser-only helpers for the admin photo forms: put an original in the
// library, and cut a place's own tile from it. The files go straight from the
// browser to Storage; the server actions only record the rows.

const BUCKET = "catalog";

export const SAVE_FAILED = "Запазването се провали. Опитайте отново.";
export const BAD_FORMAT =
  "Този формат не може да се обработи. Запазете снимката като JPG и опитайте отново.";

// Longest side of a library original: big enough to look at full screen on a
// phone, small enough for the free Storage quota.
export const ORIGINAL_SIZE = 2000;

// Tile heights per place. The carousel shows photos at most 400x500, the
// gallery grid at most ~400px wide, so these are sharp on any screen.
export const HERO_TILE_SIZE = 1200;
export const GALLERY_TILE_SIZE = 1000;

export type SaveResult = { ok: boolean; error?: string };

// Puts one file in Storage. The error message, or null when it worked.
export async function uploadFile(path: string, blob: Blob): Promise<string | null> {
  const { error } = await createClient()
    .storage.from(BUCKET)
    .upload(path, blob, { contentType: blob.type });
  return error ? `Качването се провали: ${error.message}` : null;
}

// Best effort: clears files a failed save left behind.
export async function removeFiles(paths: string[]) {
  if (paths.length) await createClient().storage.from(BUCKET).remove(paths);
}

// Shrinks a picked file and adds it to the library. `scale` is how much it was
// shrunk: a crop chosen on the picked file times `scale` is the same crop in
// the original's pixels (what a later re-crop opens).
export async function uploadOriginal(
  file: Blob,
): Promise<{ ok: true; photo: PhotoRef; scale: number } | { ok: false; error: string }> {
  try {
    const original = await resizeToWebp(file, undefined, ORIGINAL_SIZE);
    // The server only accepts .webp paths; a format the browser can't redraw
    // comes back as the original file.
    if (original.ext !== "webp") return { ok: false, error: BAD_FORMAT };

    const path = `photos/${crypto.randomUUID()}.webp`;
    const uploadError = await uploadFile(path, original.blob);
    if (uploadError) return { ok: false, error: uploadError };

    const result = await addPhoto(path);
    if (!result.ok) {
      await removeFiles([path]); // no row points at it
      return result;
    }
    return { ok: true, photo: result.photo, scale: original.scale };
  } catch {
    return { ok: false, error: SAVE_FAILED };
  }
}

// The original of a library photo, to frame it for a place. Null if it can't
// be downloaded.
export async function downloadOriginal(path: string): Promise<Blob | null> {
  try {
    const response = await fetch(imageUrl(path));
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

// Cuts and uploads a place's tile: `crop` out of `source`, into `folder` under
// a new random name (a re-crop must never reuse a cached URL). With no crop
// ("Без изрязване") the library photo itself is the tile and nothing is
// uploaded. `scale` turns the crop into the original's pixels for saving.
export async function makeTile(
  photo: PhotoRef,
  source: Blob,
  crop: CropRect | null,
  folder: string,
  size: number,
  scale = 1,
): Promise<{ ok: true; path: string; crop: CropRect | null } | { ok: false; error: string }> {
  if (!crop) return { ok: true, path: photo.path, crop: null };
  try {
    const tile = await resizeToWebp(source, crop, size, PAGE_BG);
    if (tile.ext !== "webp") return { ok: false, error: BAD_FORMAT };
    const path = `${folder}/${crypto.randomUUID()}.webp`;
    const uploadError = await uploadFile(path, tile.blob);
    if (uploadError) return { ok: false, error: uploadError };
    return { ok: true, path, crop: scaleCrop(crop, scale) };
  } catch {
    return { ok: false, error: SAVE_FAILED };
  }
}

// Runs a save action; a thrown one (network drop, server error) becomes a
// normal failure. On failure the tile just made is removed again, unless it
// is the library photo itself.
async function saveTile(
  photo: PhotoRef,
  tilePath: string,
  action: () => Promise<SaveResult & { keepFiles?: true }>,
): Promise<SaveResult> {
  let result: SaveResult & { keepFiles?: true };
  try {
    result = await action();
  } catch {
    result = { ok: false, error: SAVE_FAILED };
  }
  if (!result.ok && !result.keepFiles && tilePath !== photo.path) {
    await removeFiles([tilePath]);
  }
  return result;
}

// Puts a library photo at the end of the homepage carousel, framed the way she
// chose in the cropper. `source` is what the cropper showed.
export async function addToCarousel(
  photo: PhotoRef,
  source: Blob,
  choice: CropResult,
  scale = 1,
): Promise<SaveResult> {
  const tile = await makeTile(
    photo,
    source,
    choice.mode === "crop" ? choice.crop : null,
    "home/hero",
    HERO_TILE_SIZE,
    scale,
  );
  if (!tile.ok) return tile;
  return saveTile(photo, tile.path, () =>
    addHeroPhoto({ photoId: photo.id, path: tile.path, crop: tile.crop }),
  );
}

// Puts a library photo in the gallery with the given tags. No framing step:
// the tile is the middle of the photo, re-framed later with „Изрежи“ if needed.
export async function addToGallery(
  photo: PhotoRef,
  source: Blob,
  tagIds: string[],
  scale = 1,
): Promise<SaveResult> {
  const crop = await centerCrop(source, TILE_ASPECT);
  if (!crop) return { ok: false, error: BAD_FORMAT };
  const tile = await makeTile(photo, source, crop, "gallery", GALLERY_TILE_SIZE, scale);
  if (!tile.ok) return tile;
  return saveTile(photo, tile.path, () =>
    addGalleryPhoto({ photoId: photo.id, path: tile.path, crop: tile.crop, tagIds }),
  );
}
