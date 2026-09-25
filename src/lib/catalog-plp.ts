// Pure data + logic for the catalog page (PLP). No React, no DOM — so the server
// page and the client view can share it. The reference implementation lived in
// docs/design/plp/reference/plp-desktop.html; this ports the logic, not the DOM.

import type { CatalogGroup } from "@/lib/types";

// ---------------------------------------------------------------- flat product

// The catalog renders a flat list, so we flatten getCatalog()'s nested groups
// into one array of the fields a card and the filters actually use.
export type PlpProduct = {
  slug: string;
  name: string;
  spec: string; // description from the DB; "" when none yet
  categorySlug: string;
  categoryName: string;
  price: number | null; // null = "по запитване" (custom_quote or no base_price)
  rentable: boolean;
  isBooked: boolean; // tracked item she owns none of right now — see note below
  colors: string[]; // color slugs, for the swatch filter
  imagePath: string | null; // first image, or null -> tinted placeholder
  tint: string; // placeholder colour, per category
  createdAt: string | null; // for the "Най-нови" sort
};

export type PlpCategory = { slug: string; name: string };
export type PlpColor = { slug: string; name: string; hex: string | null };

export type PlpData = {
  products: PlpProduct[];
  categories: PlpCategory[];
  colors: PlpColor[];
};

// Placeholder tint per category — no photos exist yet, so the thumbnail is a
// flat pastel keyed off the category (brief: "tinted per category"). Falls back
// to the tinted section background for anything not listed.
const CATEGORY_TINTS: Record<string, string> = {
  arches: "var(--color-balloon-blue)",
  covers: "var(--color-balloon-pink)",
  balloons: "var(--color-balloon-yellow)",
  "balloon-figures": "var(--color-balloon-orange)",
  "character-figures": "var(--color-balloon-blue)",
  signs: "var(--color-balloon-pink)",
  props: "var(--color-balloon-orange)",
};

function tintFor(categorySlug: string) {
  return CATEGORY_TINTS[categorySlug] ?? "var(--color-surface-2)";
}

function priceOf(product: {
  base_price: number | null;
  pricing_type: "fixed" | "custom_quote";
}): number | null {
  if (product.pricing_type === "custom_quote" || product.base_price == null) {
    return null;
  }
  return product.base_price;
}

// Flatten the nested catalog into the shape the PLP consumes. Every category
// that has products becomes a filterable category — the PLP shows the whole
// catalog, not just the families that appear in the configurator.
export function toPlpData(groups: CatalogGroup[]): PlpData {
  const products: PlpProduct[] = [];
  const categories: PlpCategory[] = [];
  const colorBySlug = new Map<string, PlpColor>();

  for (const group of groups) {
    if (group.products.length === 0) continue;
    categories.push({ slug: group.slug, name: group.name });

    for (const product of group.products) {
      for (const color of product.colors) {
        if (!colorBySlug.has(color.color_slug)) {
          colorBySlug.set(color.color_slug, {
            slug: color.color_slug,
            name: color.color_name,
            hex: color.hex,
          });
        }
      }

      products.push({
        slug: product.slug,
        name: product.name,
        spec: product.description ?? "",
        categorySlug: group.slug,
        categoryName: group.name,
        price: priceOf(product),
        rentable: product.rentable,
        // Without the confirmed-bookings query wired (see the availability note
        // in PLP-BRIEF.md), the only honest "unavailable" signal is a tracked
        // product she currently owns none of. Real per-date availability is a
        // follow-up; this keeps the "Заето" card state driven by real data.
        isBooked: product.track_availability && product.quantity <= 0,
        colors: product.colors.map((color) => color.color_slug),
        imagePath: product.images?.[0]?.path ?? null,
        tint: tintFor(group.slug),
        createdAt: product.created_at ?? null,
      });
    }
  }

  return { products, categories, colors: [...colorBySlug.values()] };
}

// ------------------------------------------------------------------ price bands

export type Band = { id: string; label: string; min: number; max: number };

// Currency note: card prices use formatPrice() ("€"), so the band labels match
// it. If the currency ever changes again, that's formatPrice plus these labels.
export const BANDS: Band[] = [
  { id: "b0", label: "До 20 €", min: 0, max: 20 },
  { id: "b1", label: "20 – 40 €", min: 20, max: 40 },
  { id: "b2", label: "40 – 60 €", min: 40, max: 60 },
  { id: "b3", label: "Над 60 €", min: 60, max: Infinity },
];

function inBand(price: number, band: Band) {
  return price >= band.min && price < band.max;
}

// ----------------------------------------------------------------------- state

export type SortKey =
  | "featured"
  | "price-asc"
  | "price-desc"
  | "new"
  | "name";

export const SORTS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Препоръчани" },
  { value: "price-asc", label: "Цена: ниска → висока" },
  { value: "price-desc", label: "Цена: висока → ниска" },
  { value: "new", label: "Най-нови" },
  { value: "name", label: "Име: А → Я" },
];

export type Mode = "service" | "rent";

export type FilterState = {
  mode: Mode;
  cats: string[];
  colors: string[];
  bands: string[]; // band ids
  sort: SortKey;
};

export const EMPTY_STATE: FilterState = {
  mode: "service",
  cats: [],
  colors: [],
  bands: [],
  sort: "featured",
};

const SORT_KEYS = SORTS.map((s) => s.value);

// ---------------------------------------------------------------- filter + sort

// "Само под наем" is not cosmetic — it drops products that can't be rented on
// their own (balloons are sold, not loaned).
export function baseList(products: PlpProduct[], state: FilterState) {
  return state.mode === "rent"
    ? products.filter((product) => product.rentable)
    : products;
}

// Apply the active facets. `skip` leaves one facet out so that facet's own
// counts stay useful: picking "Арки" must not zero the count next to "Калъфи".
export function narrow(
  products: PlpProduct[],
  state: FilterState,
  skip: "cats" | "colors" | "bands" | null,
) {
  let out = products;

  if (skip !== "cats" && state.cats.length) {
    out = out.filter((product) => state.cats.includes(product.categorySlug));
  }
  if (skip !== "colors" && state.colors.length) {
    out = out.filter((product) =>
      product.colors.some((color) => state.colors.includes(color)),
    );
  }
  if (skip !== "bands" && state.bands.length) {
    const picked = BANDS.filter((band) => state.bands.includes(band.id));
    out = out.filter(
      (product) =>
        product.price !== null &&
        picked.some((band) => inBand(product.price as number, band)),
    );
  }

  return out;
}

// Items with no price ("По запитване") always sort LAST, in both price
// directions — an item without a price is not "the cheapest".
export function sortProducts(products: PlpProduct[], sort: SortKey) {
  const out = products.slice();
  switch (sort) {
    case "price-asc":
      out.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      break;
    case "price-desc":
      out.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
      break;
    case "new":
      // Newest first; anything without a timestamp (the temporary fallback) keeps
      // its incoming order at the end.
      out.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      break;
    case "name":
      // Cyrillic collation is not the default — pass the locale explicitly.
      out.sort((a, b) => a.name.localeCompare(b.name, "bg"));
      break;
    case "featured":
    default:
      // The incoming order already is the manual rank (categories.sort then
      // products.sort from getCatalog), so leave it as-is.
      break;
  }
  return out;
}

// The final visible list, filters then sort.
export function visibleProducts(products: PlpProduct[], state: FilterState) {
  return sortProducts(narrow(baseList(products, state), state, null), state.sort);
}

// Count next to each category, computed against every OTHER active facet.
export function categoryCount(
  products: PlpProduct[],
  state: FilterState,
  categorySlug: string,
) {
  return narrow(baseList(products, state), state, "cats").filter(
    (product) => product.categorySlug === categorySlug,
  ).length;
}

export function bandCount(
  products: PlpProduct[],
  state: FilterState,
  band: Band,
) {
  return narrow(baseList(products, state), state, "bands").filter(
    (product) => product.price !== null && inBand(product.price, band),
  ).length;
}

// How many facets are active (for the mobile "Филтри" badge). Sort is not a
// filter and mode counts only when it's the non-default "rent".
export function activeFilterCount(state: FilterState) {
  return (
    state.cats.length +
    state.colors.length +
    state.bands.length +
    (state.mode === "rent" ? 1 : 0)
  );
}

export function hasActiveFilters(state: FilterState) {
  return activeFilterCount(state) > 0;
}

// --------------------------------------------------------------- url <-> state

// Reads state from query params. Accepts the plain object Next gives a server
// page's `searchParams`; the client passes the same shape built from
// URLSearchParams. Unknown categories/colors/bands are dropped so a stale or
// hand-edited URL can't wedge the view.
export function parseState(
  params: Record<string, string | string[] | undefined>,
  data: PlpData,
): FilterState {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const split = (value: string | string[] | undefined) => {
    const raw = first(value);
    return raw ? raw.split(",").filter(Boolean) : [];
  };

  const knownCats = new Set(data.categories.map((c) => c.slug));
  const knownColors = new Set(data.colors.map((c) => c.slug));
  const knownBands = new Set(BANDS.map((b) => b.id));
  const sort = first(params.sort) as SortKey | undefined;

  return {
    mode: first(params.mode) === "rent" ? "rent" : "service",
    cats: split(params.cat).filter((slug) => knownCats.has(slug)),
    colors: split(params.color).filter((slug) => knownColors.has(slug)),
    bands: split(params.price).filter((id) => knownBands.has(id)),
    sort: sort && SORT_KEYS.includes(sort) ? sort : "featured",
  };
}

// Serialises state back to a query string ("" when everything is default), so
// the whole view is restorable from the URL.
export function buildQuery(state: FilterState) {
  const q = new URLSearchParams();
  if (state.mode !== "service") q.set("mode", state.mode);
  if (state.cats.length) q.set("cat", state.cats.join(","));
  if (state.colors.length) q.set("color", state.colors.join(","));
  if (state.bands.length) q.set("price", state.bands.join(","));
  if (state.sort !== "featured") q.set("sort", state.sort);
  const s = q.toString();
  return s ? `?${s}` : "";
}
