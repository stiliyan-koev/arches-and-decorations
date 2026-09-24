const ALLOWED_EXTENSIONS = ["heic", "heif", "jpg", "jpeg", "png", "webp"];

// Browser-only. Phone photos are 3–5 MB and the site renders them a few hundred
// pixels wide, so shrink before upload: it keeps the free-tier Storage quota
// sane and makes uploading over mobile data bearable.
export async function resizeToWebp(
  file: File,
  maxSize = 1600,
): Promise<{ blob: Blob; ext: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("no 2d context");

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85),
    );
    if (!blob) throw new Error("toBlob returned nothing");

    return { blob, ext: "webp" };
  } catch {
    // Some formats the browser can't decode (HEIC outside Safari, mainly).
    // Upload exactly what she picked rather than failing — a big file that
    // works beats a small one that doesn't. The extension goes into the
    // storage path, so only known image extensions get through.
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    return {
      blob: file,
      ext: ALLOWED_EXTENSIONS.includes(ext) ? ext : "jpg",
    };
  }
}
