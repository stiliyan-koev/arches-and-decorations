const ALLOWED_EXTENSIONS = ["heic", "heif", "jpg", "jpeg", "png", "webp"];

// The part of the photo to keep, in the photo's own pixels.
export type CropRect = { x: number; y: number; width: number; height: number };

// A crop chosen on one file, in the pixels of a copy shrunk by `scale` (e.g.
// the stored original, which a later re-crop opens).
export function scaleCrop(crop: CropRect, scale: number): CropRect {
  return {
    x: Math.round(crop.x * scale),
    y: Math.round(crop.y * scale),
    width: Math.round(crop.width * scale),
    height: Math.round(crop.height * scale),
  };
}

// Browser-only. Phone photos are 3–5 MB and the site renders them a few hundred
// pixels wide, so shrink before upload: it keeps the free-tier Storage quota
// sane and makes uploading over mobile data bearable. With a crop, only that
// rectangle is kept (and shrunk). The crop may reach past the photo's edges
// (a "whole photo" frame on a landscape shot): that part is filled with
// `background`, or left transparent. `scale` is how much it was shrunk, so a
// crop chosen on the original can be translated to the shrunk file.
export async function resizeToWebp(
  photo: Blob,
  crop?: CropRect,
  maxSize = 2000,
  background?: string,
): Promise<{ blob: Blob; ext: string; scale: number }> {
  try {
    const bitmap = await createImageBitmap(photo);
    const area = crop ?? {
      x: 0,
      y: 0,
      width: bitmap.width,
      height: bitmap.height,
    };
    const scale = Math.min(1, maxSize / Math.max(area.width, area.height));
    const width = Math.max(1, Math.round(area.width * scale));
    const height = Math.max(1, Math.round(area.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("no 2d context");

    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
    }

    // Draw only the part of the crop that overlaps the photo, at its offset
    // inside the crop. Handing drawImage a source rectangle that goes past the
    // photo's edges makes Safari draw nothing at all.
    const startX = Math.max(area.x, 0);
    const startY = Math.max(area.y, 0);
    const endX = Math.min(area.x + area.width, bitmap.width);
    const endY = Math.min(area.y + area.height, bitmap.height);
    if (endX > startX && endY > startY) {
      context.drawImage(
        bitmap,
        startX,
        startY,
        endX - startX,
        endY - startY,
        (startX - area.x) * scale,
        (startY - area.y) * scale,
        (endX - startX) * scale,
        (endY - startY) * scale,
      );
    }
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85),
    );
    if (!blob) throw new Error("toBlob returned nothing");

    return { blob, ext: "webp", scale };
  } catch {
    // Some formats the browser can't decode (HEIC outside Safari, mainly).
    // Upload exactly what she picked rather than failing — a big file that
    // works beats a small one that doesn't. The extension goes into the
    // storage path, so only known image extensions get through.
    const name = photo instanceof File ? photo.name : "";
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    return {
      blob: photo,
      ext: ALLOWED_EXTENSIONS.includes(ext) ? ext : "jpg",
      scale: 1,
    };
  }
}

// Browser-only. The middle part of the photo in the given width/height shape
// (e.g. 4/5), in the photo's own pixels: what a gallery tile shows when she
// uploads a batch without framing each photo. Undefined when the browser
// can't open the photo; resizeToWebp then handles it as it is.
export async function centerCrop(
  photo: Blob,
  aspect: number,
): Promise<CropRect | undefined> {
  try {
    const bitmap = await createImageBitmap(photo);
    const { width, height } = bitmap;
    bitmap.close();

    // Too wide for the shape: keep the full height, cut the sides.
    if (width / height > aspect) {
      const cropWidth = Math.round(height * aspect);
      return { x: Math.round((width - cropWidth) / 2), y: 0, width: cropWidth, height };
    }
    // Too tall: keep the full width, cut top and bottom.
    const cropHeight = Math.round(width / aspect);
    return { x: 0, y: Math.round((height - cropHeight) / 2), width, height: cropHeight };
  } catch {
    return undefined;
  }
}
