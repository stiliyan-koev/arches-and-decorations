"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { CropRect } from "@/lib/resize-image";
import { TILE_ASPECT } from "@/lib/images";

// Tiles show photos at 4:5, so that's the only shape she can cut. The square
// views (configurator preview) keep the middle of it — between the dashed lines.
const ASPECT = TILE_ASPECT;

// The smallest frame, as a share of the photo's width. Any tighter and the
// tile would be blowing up a handful of pixels.
const MIN_SHARE = 0.15;

type Corner = "nw" | "ne" | "sw" | "se";
const CORNERS: Corner[] = ["nw", "ne", "sw", "se"];
const CORNER_CLASS: Record<Corner, string> = {
  nw: "left-0 top-0 cursor-nwse-resize items-start justify-start",
  ne: "right-0 top-0 cursor-nesw-resize items-start justify-end",
  sw: "left-0 bottom-0 cursor-nesw-resize items-end justify-start",
  se: "right-0 bottom-0 cursor-nwse-resize items-end justify-end",
};

// Everything is in the photo's own pixels, so the frame means the same thing
// however big the photo happens to be drawn on screen. Height is always
// width / ASPECT, so it isn't stored.
type Size = { width: number; height: number };
type Frame = { x: number; y: number; width: number };
type Drag = {
  mode: "move" | Corner;
  startX: number;
  startY: number;
  start: Frame;
};

type Props = {
  source: Blob;
  title: string;
  cancelLabel: string;
  // null means the browser couldn't open the photo (HEIC outside Safari):
  // upload it as it is, like before there was a cropper.
  onConfirm: (crop: CropRect | null) => void;
  onCancel: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// The biggest 4:3 frame that fits, centred — what she gets if she just saves.
function largestFrame(size: Size): Frame {
  const width = Math.min(size.width, size.height * ASPECT);
  return {
    x: (size.width - width) / 2,
    y: (size.height - width / ASPECT) / 2,
    width,
  };
}

function moveFrame(size: Size, start: Frame, dx: number, dy: number): Frame {
  return {
    x: clamp(start.x + dx, 0, size.width - start.width),
    y: clamp(start.y + dy, 0, size.height - start.width / ASPECT),
    width: start.width,
  };
}

// Dragging a corner keeps the opposite corner where it is and grows or shrinks
// the frame towards the pointer, never past the photo's edges.
function resizeFrame(
  size: Size,
  start: Frame,
  corner: Corner,
  dx: number,
  dy: number,
): Frame {
  const east = corner.includes("e");
  const south = corner.includes("s");
  const anchorX = east ? start.x : start.x + start.width;
  const anchorY = south ? start.y : start.y + start.width / ASPECT;

  // Follow whichever direction the pointer moved more, so a mostly vertical
  // drag works as well as a horizontal one.
  const fromX = start.width + (east ? dx : -dx);
  const fromY = start.width + (south ? dy : -dy) * ASPECT;
  const wanted =
    Math.abs(fromX - start.width) > Math.abs(fromY - start.width) ? fromX : fromY;

  const roomX = east ? size.width - anchorX : anchorX;
  const roomY = south ? size.height - anchorY : anchorY;
  const max = Math.min(roomX, roomY * ASPECT);
  const width = clamp(wanted, Math.min(size.width * MIN_SHARE, max), max);

  return {
    x: east ? anchorX : anchorX - width,
    y: south ? anchorY : anchorY - width / ASPECT,
    width,
  };
}

export default function ImageCropper({
  source,
  title,
  cancelLabel,
  onConfirm,
  onCancel,
}: Props) {
  // Revoked once the photo has loaded; the drawn image stays on screen.
  const [url] = useState(() => URL.createObjectURL(source));
  const imageRef = useRef<HTMLImageElement>(null);
  const drag = useRef<Drag | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [frame, setFrame] = useState<Frame | null>(null);

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

  function handleLoad() {
    const image = imageRef.current;
    if (!image) return;
    const natural = { width: image.naturalWidth, height: image.naturalHeight };
    setSize(natural);
    setFrame(largestFrame(natural));
    URL.revokeObjectURL(url);
  }

  function handleError() {
    // Only a photo that never opened counts as undecodable.
    if (size) return;
    URL.revokeObjectURL(url);
    onConfirm(null);
  }

  function startDrag(event: PointerEvent<HTMLElement>, mode: Drag["mode"]) {
    if (!frame) return;
    // A corner sits inside the frame; don't let the frame start a move too.
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      start: frame,
    };
  }

  function handleMove(event: PointerEvent<HTMLElement>) {
    const current = drag.current;
    const image = imageRef.current;
    if (!current || !image || !size) return;

    // Screen pixels → photo pixels.
    const scale = size.width / image.getBoundingClientRect().width;
    const dx = (event.clientX - current.startX) * scale;
    const dy = (event.clientY - current.startY) * scale;

    setFrame(
      current.mode === "move"
        ? moveFrame(size, current.start, dx, dy)
        : resizeFrame(size, current.start, current.mode, dx, dy),
    );
  }

  function endDrag() {
    drag.current = null;
  }

  function handleSave() {
    if (!frame) return;
    onConfirm({
      x: Math.round(frame.x),
      y: Math.round(frame.y),
      width: Math.round(frame.width),
      height: Math.round(frame.width / ASPECT),
    });
  }

  const percent = (value: number, total: number) => `${(value / total) * 100}%`;

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
          Плъзнете рамката, за да изберете какво да се вижда; ъглите я
          уголемяват. Частта между пунктирите (горе и долу) се вижда в
          квадратните изгледи.
        </p>

        {!size && (
          <p className="mt-4 text-center text-[0.85rem] font-bold text-muted">
            Зареждане на снимката…
          </p>
        )}

        <div className="mt-4 flex justify-center">
          <div className="relative inline-block overflow-hidden rounded-item bg-surface-2 select-none">
            {/* A local object URL — next/image has nothing to optimise here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={url}
              alt=""
              draggable={false}
              onLoad={handleLoad}
              onError={handleError}
              className="block max-h-[60vh] max-w-full"
            />

            {size && frame && (
              <div
                onPointerDown={(event) => startDrag(event, "move")}
                onPointerMove={handleMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                style={{
                  left: percent(frame.x, size.width),
                  top: percent(frame.y, size.height),
                  width: percent(frame.width, size.width),
                  height: percent(frame.width / ASPECT, size.height),
                }}
                className="absolute cursor-move touch-none border-2 border-white shadow-[0_0_0_9999px_rgb(0_0_0/0.55)]"
              >
                <span className="pointer-events-none absolute inset-x-0 top-[10%] bottom-[10%] border-y border-dashed border-white/80" />
                {CORNERS.map((corner) => (
                  <span
                    key={corner}
                    onPointerDown={(event) => startDrag(event, corner)}
                    className={`absolute flex h-9 w-9 touch-none ${CORNER_CLASS[corner]}`}
                  >
                    <span className="h-3.5 w-3.5 rounded-[3px] bg-white shadow-[0_1px_4px_rgb(0_0_0/0.5)]" />
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
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
            disabled={!frame}
            className="cursor-pointer rounded-full bg-cta px-6 py-2.5 font-extrabold text-white hover:bg-cta-strong disabled:opacity-60"
          >
            Запази
          </button>
        </div>
      </div>
    </div>
  );
}
