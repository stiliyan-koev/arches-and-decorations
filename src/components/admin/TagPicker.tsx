"use client";

import { useId, useState } from "react";
import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slug";
import { TAG_NAME_MAX } from "@/lib/gallery";
import type { GalleryTag } from "@/lib/gallery";
import { createGalleryTag } from "@/app/admin/actions";

// How many matches the list shows. She narrows it by typing, not scrolling.
const MAX_MATCHES = 8;

type Props = {
  tags: GalleryTag[]; // the tags to choose from
  label: string; // the closed button, e.g. "+ Етикет"
  onPick: (tag: GalleryTag) => void;
  // Offer „Създай …“ when nothing matches. Off where a new tag makes no sense
  // (removing a tag from a selection).
  allowCreate?: boolean;
  disabled?: boolean;
  // Open the list above the box, for a picker that sits at the bottom of the
  // screen (the selection bar).
  openUp?: boolean;
  onError?: (message: string) => void;
};

// A tag picker that scales to hundreds of tags: a button that opens a search
// box, a short list of matches as she types, and „Създай „…““ when the tag
// doesn't exist yet. Arrow keys + Enter work, Escape closes.
export default function TagPicker({
  tags,
  label,
  onPick,
  allowCreate = true,
  disabled = false,
  openUp = false,
  onError,
}: Props) {
  const router = useRouter();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);

  // Match on the name, and on the slug so „hulk“ also finds „Хълк“.
  const text = query.trim().toLowerCase();
  const slug = slugify(query);
  const matches = (
    text
      ? tags.filter(
          (tag) => tag.name.toLowerCase().includes(text) || (slug && tag.slug.includes(slug)),
        )
      : tags
  ).slice(0, MAX_MATCHES);
  const exists = tags.some((tag) => tag.slug === slug);
  const canCreate = allowCreate && slug !== "" && !exists;
  // The options in order: the matches, then „Създай“ if offered.
  const optionCount = matches.length + (canCreate ? 1 : 0);

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  function pick(tag: GalleryTag) {
    close();
    onPick(tag);
  }

  async function create() {
    setCreating(true);
    let result;
    try {
      result = await createGalleryTag(query);
    } catch {
      result = { ok: false as const, error: "Етикетът не може да се създаде." };
    }
    setCreating(false);
    if (!result.ok) {
      close();
      onError?.(result.error);
      return;
    }
    router.refresh(); // the new tag joins every other picker's list
    pick(result.tag);
  }

  function choose(index: number) {
    if (index < matches.length) pick(matches[index]);
    else if (canCreate) create();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((active + 1) % Math.max(optionCount, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((active - 1 + optionCount) % Math.max(optionCount, 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (optionCount > 0) choose(Math.min(active, optionCount - 1));
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-full border border-dashed border-border-strong px-2.5 py-1 text-[0.75rem] font-extrabold text-muted hover:border-cta hover:text-cta disabled:cursor-default disabled:opacity-50"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="relative w-full max-w-[260px]">
      <input
        autoFocus
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={handleKeyDown}
        // Leaving the box closes it. The options use onMouseDown +
        // preventDefault, so clicking one doesn't blur the box first.
        onBlur={() => {
          if (!creating) close();
        }}
        maxLength={TAG_NAME_MAX}
        disabled={creating}
        placeholder="Търси или създай етикет"
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={optionCount > 0 ? `${listId}-${active}` : undefined}
        className="w-full rounded-item border border-cta bg-bg px-2.5 py-1.5 text-[0.8rem] outline-none"
      />
      <ul
        id={listId}
        role="listbox"
        className={`absolute inset-x-0 z-20 max-h-72 ${openUp ? "bottom-full mb-1" : "top-full mt-1"} overflow-y-auto rounded-item border border-border bg-surface py-1 shadow-[0_6px_20px_rgb(59_47_66/0.18)]`}
      >
        {matches.map((tag, index) => (
          <li
            key={tag.id}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            onMouseDown={(event) => {
              event.preventDefault();
              pick(tag);
            }}
            onMouseEnter={() => setActive(index)}
            className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-[0.8rem] ${
              index === active ? "bg-cta/10 text-cta" : "text-ink"
            }`}
          >
            <span className="truncate font-bold">{tag.name}</span>
            <span className="shrink-0 text-[0.7rem] text-muted tabular-nums">{tag.count}</span>
          </li>
        ))}
        {canCreate && (
          <li
            id={`${listId}-${matches.length}`}
            role="option"
            aria-selected={active === matches.length}
            onMouseDown={(event) => {
              event.preventDefault();
              create();
            }}
            onMouseEnter={() => setActive(matches.length)}
            className={`cursor-pointer border-t border-border px-3 py-1.5 text-[0.8rem] font-extrabold ${
              active === matches.length ? "bg-cta/10 text-cta" : "text-cta"
            }`}
          >
            {creating ? "Създаване…" : `+ Създай „${query.trim()}“`}
          </li>
        )}
        {optionCount === 0 && (
          <li className="px-3 py-1.5 text-[0.8rem] text-muted">
            {tags.length === 0 ? "Няма етикети." : "Няма такъв етикет."}
          </li>
        )}
      </ul>
    </div>
  );
}
