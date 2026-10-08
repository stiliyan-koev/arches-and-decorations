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

// How many letters she types before anything is suggested.
const MIN_CHARS = 2;

// Where `text` starts a word of `value`, or -1. Any character that is not a
// letter or digit (space, "·", "-", "„") separates words, so "рож" and "елза"
// both find "Рожден ден Елза", while "ден" doesn't find "Рожденден".
// `text` must already be lower case.
function wordStart(value: string, text: string) {
  const lower = value.toLocaleLowerCase("bg");
  for (let index = lower.indexOf(text); index !== -1; index = lower.indexOf(text, index + 1)) {
    if (index === 0 || !/[\p{L}\p{N}]/u.test(lower[index - 1])) return index;
  }
  return -1;
}

// The tags whose name has a word starting with what she typed, or whose slug
// does (so the Latin "hulk" also finds „Хълк“). Names that start with it come
// first; otherwise the list keeps its order (by name).
function findTags(tags: GalleryTag[], query: string) {
  const text = query.trim().toLocaleLowerCase("bg");
  const slug = slugify(query);
  const found: { tag: GalleryTag; first: boolean }[] = [];
  for (const tag of tags) {
    const index = wordStart(tag.name, text);
    if (index !== -1 || (slug && wordStart(tag.slug, slug) !== -1)) {
      found.push({ tag, first: index === 0 });
    }
  }
  return [...found.filter((item) => item.first), ...found.filter((item) => !item.first)].map(
    (item) => item.tag,
  );
}

type Props = {
  tags: GalleryTag[]; // every tag, so „Създай“ knows which names are taken
  excludeIds?: string[]; // tags not to offer here (e.g. the photo already has them)
  label: string; // the closed button, e.g. "+ Етикет"
  onPick: (tag: GalleryTag) => void;
  // Offer „Създай …“ when nothing matches. Off where a new tag makes no sense
  // (removing a tag from a selection).
  allowCreate?: boolean;
  // Letters to type before anything is suggested. 0 lists every tag offered
  // straight away: for a short list (the tags a selection already has).
  minChars?: number;
  disabled?: boolean;
  // Open the list above the box, for a picker that sits at the bottom of the
  // screen (the selection bar).
  openUp?: boolean;
  onError?: (message: string) => void;
};

// A tag picker that scales to hundreds of tags: a button that opens a search
// box. From the second letter she types it suggests the tags with a word
// starting with it, and „Създай „…““ when the tag doesn't exist yet. Arrow
// keys + Enter work, Escape closes.
export default function TagPicker({
  tags,
  excludeIds = [],
  label,
  onPick,
  allowCreate = true,
  minChars = MIN_CHARS,
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

  const slug = slugify(query);
  const offered = tags.filter((tag) => !excludeIds.includes(tag.id));
  // Nothing is suggested (or created) until she has typed enough.
  const typed = query.trim().length;
  const tooShort = typed < minChars;
  const matches = tooShort
    ? []
    : (typed === 0 ? offered : findTags(offered, query)).slice(0, MAX_MATCHES);
  const exists = tags.some((tag) => tag.slug === slug);
  const canCreate = allowCreate && !tooShort && slug !== "" && !exists;
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
            {offered.length === 0
              ? "Няма етикети."
              : tooShort
                ? `Напишете поне ${minChars} букви.`
                : "Няма такъв етикет."}
          </li>
        )}
      </ul>
    </div>
  );
}
