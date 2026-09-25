"use client";

import { useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import type { CropRect } from "@/lib/resize-image";
import { TILE_ASPECT } from "@/lib/images";

const MAX_ZOOM = 4;
const ZOOM_STEP = 0.05;

// Below this many pixels wide, a tile starts to look soft on a phone screen.
const SMALL_WIDTH = 500;

// What she chose. "Цялата снимка" is a crop too (one that reaches past the
// photo's edges); "original" is "Без изрязване", or a photo the browser can't
// open (HEIC outside Safari), which is uploaded as it is.
export type CropResult =
  | { mode: "crop"; crop: CropRect }
  | { mode: "original" };

type Props = {
  source: Blob;
  title: string;
  cancelLabel: string;
  // Where she left the frame last time, in the source's own pixels.
  initialCrop?: CropRect;
  onConfirm: (result: CropResult) => void;
  onCancel: () => void;
};

// The photo, measured before the cropper mounts (see the effect below).
type Photo = { url: string; width: number; height: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function ImageCropper({
  source,
  title,
  cancelLabel,
  initialCrop,
  onConfirm,
  onCancel,
}: Props) {
  const [photo, setPhoto] = useState<Photo | null>(null);
  // The frame's position and zoom, as react-easy-crop wants them.
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  // The part of the photo inside the frame, in the photo's own pixels. This
  // is what gets saved.
  const [area, setArea] = useState<CropRect | null>(initialCrop ?? null);

  // The parent passes a new arrow function every render; keep the latest one
  // without re-running the measuring effect.
  const onConfirmRef = useRef(onConfirm);
  useEffect(() => {
    onConfirmRef.current = onConfirm;
  });

  // Measure the photo BEFORE mounting <Cropper>. It applies initialCrop
  // (clamped to minZoom) before it tells us the photo's size, so a minZoom
  // worked out after load would come too late: a saved "Цялата снимка" frame
  // would reopen clamped to zoom 1. The object URL lives as long as the
  // cropper does.
  useEffect(() => {
    const url = URL.createObjectURL(source);
    const probe = new Image();
    probe.onload = () =>
      setPhoto({ url, width: probe.naturalWidth, height: probe.naturalHeight });
    probe.onerror = () => onConfirmRef.current({ mode: "original" });
    probe.src = url;
    return () => {
      probe.onload = null;
      probe.onerror = null;
      URL.revokeObjectURL(url);
    };
  }, [source]);

  // Same as the configurator modal: lock the page behind it, Escape cancels.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleKey);
    };
  }, [onCancel]);

  // The zoom at which the whole photo fits inside the 4:5 frame. At zoom 1
  // the frame is as big as fits inside the photo, so this is always <= 1.
  const photoAspect = photo ? photo.width / photo.height : TILE_ASPECT;
  const fitZoom = Math.min(
    TILE_ASPECT / photoAspect,
    photoAspect / TILE_ASPECT,
  );

  function changeZoom(value: number) {
    setZoom(clamp(value, fitZoom, MAX_ZOOM));
  }

  // Zoom out until the whole photo is in the frame. The gaps are filled with
  // the page background when the tile is made.
  function showWholePhoto() {
    setZoom(fitZoom);
    setCrop({ x: 0, y: 0 });
  }

  // Fires on every move and zoom (onCropComplete skips some position-only
  // changes), so what she sees is what gets saved.
  function handleAreaChange(_percentages: Area, pixels: Area) {
    setArea({
      x: Math.round(pixels.x),
      y: Math.round(pixels.y),
      width: Math.round(pixels.width),
      height: Math.round(pixels.height),
    });
  }

  function handleSave() {
    if (area) onConfirm({ mode: "crop", crop: area });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[94vh] w-[min(880px,100%)] overflow-auto overscroll-contain rounded-card bg-surface p-5 shadow-[0_24px_60px_rgb(62_47_53/0.3)]"
      >
        <h3 className="text-lg">{title}</h3>
        <p className="mt-1 text-[0.85rem] text-muted">
          Плъзнете снимката, за да я наместите. Приближавайте с плъзгача,
          колелцето или с два пръста. Частта между пунктирите се вижда в
          квадратните изгледи.
        </p>

        {/* react-easy-crop fills its parent, so the parent needs a size. */}
        <div className="relative mt-4 h-[60vh] overflow-hidden rounded-item bg-ink">
          {photo ? (
            <Cropper
              image={photo.url}
              aspect={TILE_ASPECT}
              objectFit="contain"
              showGrid={false}
              crop={crop}
              zoom={zoom}
              minZoom={fitZoom}
              maxZoom={MAX_ZOOM}
              // Zoomed in, she can't drag empty space into the frame by
              // accident. Zoomed out (whole photo), it moves freely.
              restrictPosition={zoom >= 1}
              initialCroppedAreaPixels={initialCrop}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropAreaChange={handleAreaChange}
              classes={{ cropAreaClassName: "crop-square-guide" }}
            />
          ) : (
            <p className="absolute inset-0 flex items-center justify-center text-[0.85rem] font-bold text-white/80">
              Зареждане на снимката…
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => changeZoom(zoom - ZOOM_STEP)}
            disabled={!photo}
            aria-label="Отдалечи"
            className="h-9 w-9 shrink-0 cursor-pointer rounded-full border border-border-strong text-lg font-extrabold text-ink hover:border-rose disabled:opacity-50"
          >
            −
          </button>
          <input
            type="range"
            min={fitZoom}
            max={MAX_ZOOM}
            step={ZOOM_STEP}
            value={zoom}
            disabled={!photo}
            onChange={(event) => changeZoom(Number(event.target.value))}
            aria-label="Мащаб"
            className="w-full cursor-pointer accent-cta"
          />
          <button
            type="button"
            onClick={() => changeZoom(zoom + ZOOM_STEP)}
            disabled={!photo}
            aria-label="Приближи"
            className="h-9 w-9 shrink-0 cursor-pointer rounded-full border border-border-strong text-lg font-extrabold text-ink hover:border-rose disabled:opacity-50"
          >
            +
          </button>
        </div>

        {area && area.width < SMALL_WIDTH && (
          <p className="mt-3 rounded-item bg-booked/10 px-3 py-2 text-[0.85rem] font-bold text-booked">
            Снимката е малка за тази рамка — може да изглежда размазана.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={showWholePhoto}
            disabled={!photo}
            className="cursor-pointer rounded-full border border-border-strong px-5 py-2.5 font-extrabold text-ink hover:border-rose hover:text-rose-ink disabled:opacity-60"
          >
            Цялата снимка
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ mode: "original" })}
            disabled={!photo}
            className="cursor-pointer rounded-full border border-border-strong px-5 py-2.5 font-extrabold text-ink hover:border-rose hover:text-rose-ink disabled:opacity-60"
          >
            Без изрязване
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-full border border-border-strong px-5 py-2.5 font-extrabold text-muted hover:border-rose hover:text-rose-ink"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!photo || !area}
            className="cursor-pointer rounded-full bg-cta px-6 py-2.5 font-extrabold text-white hover:bg-cta-strong disabled:opacity-60"
          >
            Запази
          </button>
        </div>
      </div>
    </div>
  );
}
