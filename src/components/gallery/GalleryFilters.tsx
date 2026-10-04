"use client";

import { useState } from "react";
import Link from "next/link";
import { slugify } from "@/lib/slug";
import { galleryHref } from "@/lib/gallery";
import type { GalleryTag } from "@/lib/gallery";

// How many tags show as chips. The rest sit behind „Още поводи“, so the page
// starts with the photos, not a wall of filters.
const TOP_COUNT = 8;

const CHIP =
  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-4 text-[15px] font-extrabold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta";
const CHIP_ON = "border-ink bg-ink text-white";
const CHIP_OFF = "border-border-strong bg-surface text-ink hover:border-cta hover:text-cta";

type Props = {
  tags: GalleryTag[]; // only tags that have photos
  activeTag: GalleryTag | null;
};

// „Всички“ plus the tags with the most photos as chips (one swipeable row on
// phones), and „Още поводи“ for the rest: a panel with every tag and a
// search box.
export default function GalleryFilters({ tags, activeTag }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // The picked tag always has a chip, even when it isn't one of the top ones.
  const byCount = [...tags].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "bg"));
  let top = byCount.slice(0, TOP_COUNT);
  if (activeTag && !top.some((tag) => tag.id === activeTag.id)) {
    top = [activeTag, ...top.slice(0, TOP_COUNT - 1)];
  }
  const hasMore = tags.length > top.length;

  // Match on the name, and on the slug so „frozen“ also finds „Фрозен“.
  const text = query.trim().toLowerCase();
  const slug = slugify(query);
  const matches = text
    ? tags.filter((tag) => tag.name.toLowerCase().includes(text) || (slug && tag.slug.includes(slug)))
    : tags;

  function chip(tag: GalleryTag | null, label: string, count?: number) {
    const on = tag ? activeTag?.id === tag.id : !activeTag;
    return (
      <Link
        href={galleryHref(tag)}
        scroll={false}
        onClick={() => setOpen(false)}
        aria-current={on ? "page" : undefined}
        className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
      >
        {label}
        {count !== undefined && (
          <span className={`text-[13px] tabular-nums ${on ? "text-white/70" : "text-muted"}`}>
            {count}
          </span>
        )}
      </Link>
    );
  }

  return (
    <nav aria-label="Филтър по повод" className="mt-8">
      {/* Phones: one row to swipe, bleeding to the screen edges. Wider: wraps. */}
      <ul className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        <li>{chip(null, "Всички")}</li>
        {top.map((tag) => (
          <li key={tag.id}>{chip(tag, tag.name, tag.count)}</li>
        ))}
        {hasMore && (
          <li>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              className={`${CHIP} cursor-pointer border-dashed ${open ? "border-cta text-cta" : CHIP_OFF}`}
            >
              Още поводи
              <span aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>
          </li>
        )}
      </ul>

      {open && (
        <div className="mt-3 rounded-card border border-border bg-surface p-4 shadow-card">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
            placeholder="Търси повод или тема…"
            aria-label="Търси повод"
            className="w-full rounded-item border border-border-strong bg-bg px-4 py-2.5 text-[15px] outline-none focus:border-cta md:max-w-sm"
          />
          {matches.length === 0 ? (
            <p className="mt-3 text-[15px] text-muted">Няма такъв повод.</p>
          ) : (
            <ul className="mt-3 flex max-h-72 flex-wrap gap-2 overflow-y-auto">
              {[...matches]
                .sort((a, b) => a.name.localeCompare(b.name, "bg"))
                .map((tag) => (
                  <li key={tag.id}>{chip(tag, tag.name, tag.count)}</li>
                ))}
            </ul>
          )}
        </div>
      )}
    </nav>
  );
}
