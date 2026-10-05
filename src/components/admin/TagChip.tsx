"use client";

import type { GalleryTag } from "@/lib/gallery";

// A tag on a photo (or on the next upload), with ✕ to take it off.
export default function TagChip({
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
