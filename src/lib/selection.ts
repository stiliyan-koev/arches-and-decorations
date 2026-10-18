"use client";

import { useSyncExternalStore } from "react";

// The basket ("оферта") — the products the visitor has picked to ask about, each
// with a quantity. It lives here, in one place, so the catalog's mini-basket and
// the /request page read and write the SAME list.
//
// Products are keyed by slug (stable, human-readable, and enough to resolve back
// to a product on either page), plus the colour's slug for a product with
// colours: the same product in two colours is two lines. We persist to
// localStorage so the basket survives the full-page navigation from /catalog to
// /request — React state alone would be lost on every such hop.

export type BasketLine = {
  slug: string;
  color: string | null; // colour slug; null = the product has no colours
  qty: number;
  // What the customer wrote in „Опишете вашите изисквания“ (products with
  // „Прозорец за изисквания“); "" = nothing. Sent as the item's custom text.
  requirements: string;
};

const KEY = "oferta.v1";

// Most different products one request can hold. Must match MAX_ITEMS in
// src/app/actions.ts, or the server rejects a basket the catalog let through.
export const MAX_LINES = 30;

// Longest requirements text. Must match MAX_CUSTOM_TEXT in src/app/actions.ts
// (and the 1000 in booking_items' check), or the server rejects the request.
export const REQUIREMENTS_MAX = 1000;

let lines: BasketLine[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

// Read once, lazily, the first time the store is used in the browser. Wrapped in
// try/catch because localStorage can throw (private mode, blocked cookies).
// Older visitors have a plain list of slugs stored under the same key; each of
// those becomes a line with qty 1. Lines saved before colours have no colour,
// and lines saved before requirements have none.
function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return;
    for (const entry of parsed) {
      if (typeof entry === "string") {
        lines.push({ slug: entry, color: null, qty: 1, requirements: "" });
      } else if (
        entry &&
        typeof entry.slug === "string" &&
        Number.isInteger(entry.qty) &&
        entry.qty > 0
      ) {
        const color = typeof entry.color === "string" ? entry.color : null;
        const requirements =
          typeof entry.requirements === "string"
            ? entry.requirements.slice(0, REQUIREMENTS_MAX)
            : "";
        lines.push({ slug: entry.slug, color, qty: entry.qty, requirements });
      }
    }
  } catch {
    lines = [];
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // A full or unavailable localStorage just means the basket won't survive a
    // reload — the in-memory list still works for this session.
  }
}

// Every change replaces `lines` with a new array, saves it and tells the
// subscribers.
function commit(next: BasketLine[]) {
  lines = next;
  persist();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The snapshot must be referentially stable between renders when nothing changed,
// or useSyncExternalStore loops. `lines` is only ever replaced on an actual
// change, so returning it directly is safe.
function getSnapshot() {
  hydrate();
  return lines;
}

// Server render (and the first client render, before hydration) sees an empty
// basket. useSyncExternalStore then swaps in the real list on the client without
// a hydration mismatch.
const EMPTY: BasketLine[] = [];
function getServerSnapshot() {
  return EMPTY;
}

// Whether a stored line is this product in this colour.
function isLine(line: BasketLine, slug: string, color: string | null) {
  return line.slug === slug && line.color === color;
}

export const selection = {
  has(slug: string, color: string | null) {
    hydrate();
    return lines.some((line) => isLine(line, slug, color));
  },
  // Adds one of the product in that colour, with what the customer wrote in
  // „Опишете вашите изисквания“ (if the product asks). A line already in the
  // basket is left as it is, and a full basket (MAX_LINES) takes nothing more.
  // Returns whether it added.
  add(slug: string, color: string | null, requirements = "") {
    if (this.has(slug, color)) return false;
    if (lines.length >= MAX_LINES) return false;
    commit([...lines, { slug, color, qty: 1, requirements }]);
    return true;
  },
  // The requirements box on a basket line, edited in place.
  setRequirements(slug: string, color: string | null, requirements: string) {
    if (!this.has(slug, color)) return;
    commit(
      lines.map((line) =>
        isLine(line, slug, color) ? { ...line, requirements } : line,
      ),
    );
  },
  // Zero or less removes the line.
  setQty(slug: string, color: string | null, qty: number) {
    if (!this.has(slug, color)) return;
    if (qty <= 0) return this.remove(slug, color);
    commit(
      lines.map((line) => (isLine(line, slug, color) ? { ...line, qty } : line)),
    );
  },
  remove(slug: string, color: string | null) {
    if (!this.has(slug, color)) return;
    commit(lines.filter((line) => !isLine(line, slug, color)));
  },
  clear() {
    hydrate();
    if (lines.length === 0) return;
    commit([]);
  },
};

// The whole basket, reactive. Components re-render when it changes.
export function useBasket() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Whether one product, in one colour, is in the basket — what a catalog card
// needs. A boolean is a stable snapshot, so adding one card re-renders only that
// card, not all of them.
export function useIsSelected(slug: string, color: string | null) {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().some((line) => isLine(line, slug, color)),
    () => false,
  );
}
