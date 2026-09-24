"use client";

import { useSyncExternalStore } from "react";

// The shared "оферта" selection — the list of products the visitor has picked to
// ask about. It lives here, in one place, so the catalog page and the
// configurator read and write the SAME list instead of each keeping its own.
//
// Products are keyed by slug (stable, human-readable, and enough to resolve back
// to a product on either page). We persist to localStorage so the selection
// survives the full-page navigation between /catalog and the configurator on the
// homepage — React state alone would be lost on every such hop.
//
// TODO(configurator): the homepage Configurator still keeps its own local
// `items` state and does not read this store yet. Wiring it to consume the
// selection (so items added on the catalog show up in the оферта) is a separate
// task — see PLP-BRIEF.md and the "configurator itself" out-of-scope note.

const KEY = "oferta.v1";

let slugs: string[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

// Read once, lazily, the first time the store is used in the browser. Wrapped in
// try/catch because localStorage can throw (private mode, blocked cookies).
function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      slugs = parsed.filter((s): s is string => typeof s === "string");
    }
  } catch {
    slugs = [];
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(slugs));
  } catch {
    // A full or unavailable localStorage just means the selection won't survive
    // a reload — the in-memory list still works for this session.
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The snapshot must be referentially stable between renders when nothing changed,
// or useSyncExternalStore loops. We only ever replace `slugs` with a new array on
// an actual change, so returning it directly is safe.
function getSnapshot() {
  hydrate();
  return slugs;
}

// Server render (and the first client render, before hydration) sees an empty
// selection. useSyncExternalStore then swaps in the real list on the client
// without a hydration mismatch.
const EMPTY: string[] = [];
function getServerSnapshot() {
  return EMPTY;
}

export const selection = {
  has(slug: string) {
    hydrate();
    return slugs.includes(slug);
  },
  add(slug: string) {
    hydrate();
    if (slugs.includes(slug)) return;
    slugs = [...slugs, slug];
    persist();
    emit();
  },
  remove(slug: string) {
    hydrate();
    if (!slugs.includes(slug)) return;
    slugs = slugs.filter((s) => s !== slug);
    persist();
    emit();
  },
  toggle(slug: string) {
    if (this.has(slug)) this.remove(slug);
    else this.add(slug);
  },
  clear() {
    hydrate();
    if (slugs.length === 0) return;
    slugs = [];
    persist();
    emit();
  },
};

// The whole selection, reactive. Components re-render when it changes.
export function useSelection() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Just the count — the header pill only needs this, and subscribing to the array
// would re-render it on every reorder. The count is a primitive, so it's a stable
// snapshot on its own.
export function useSelectionCount() {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().length,
    () => 0,
  );
}

// Whether one product is picked — what a catalog card needs. A boolean is a
// stable snapshot, so toggling one card re-renders only that card, not all of them.
export function useIsSelected(slug: string) {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().includes(slug),
    () => false,
  );
}
