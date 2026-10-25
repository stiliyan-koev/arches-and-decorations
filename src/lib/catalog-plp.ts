// Pure data + logic for the catalog page (PLP). No React, no DOM — so the server
// page and the client view can share it. The reference implementation lived in
// docs/design/plp/reference/plp-desktop.html; this ports the logic, not the DOM.

import type { CatalogGroup, ProductImage } from "@/lib/types";
import { carouselImages, fullImagePath } from "@/lib/images";
import type { BasketLine } from "@/lib/selection";

// ---------------------------------------------------------------- flat product

// One colour of a product, as a swatch on its card. Each colour has its own
// stock, and the photos she tagged with it replace the card's photo.
export type PlpSwatch = {
  id: string; // product_colors.id — what a booking_items row's color_id points at
  slug: string; // stored in the basket next to the product slug
  name: string;
  hex: string | null; // null = pattern (e.g. "Замък на Елза")
  stock: number | null; // how many of this colour she owns; null = consumable
  maxQty: number; // the most one request may ask for in this colour
  images: ProductImage[]; // her photos of this colour, in order; [] = keep the product's photo
};

// The catalog renders a flat list, so we flatten getCatalog()'s nested groups
// into one array of the fields a card and the filters actually use.
export type PlpProduct = {
  id: string; // what a booking_items row points at
  slug: string;
  name: string;
  spec: string; // description from the DB; "" when none yet
  categorySlug: string;
  categoryName: string;
  price: number | null; // null = "по запитване" (custom_quote or no base_price)
  rentable: boolean; // may go out without her setting it up (offer_mode rent/both)
  setupPossible: boolean; // she may set it up (offer_mode both/setup)
  coversNeeded: number; // arch covers one piece needs; 0 = none
  isCover: boolean; // an arch cover, counted against coversNeeded in the basket
  asksRequirements: boolean; // „Добави“ first asks „Опишете вашите изисквания“
  stock: number | null; // how many she owns; null = consumable, never runs out
  maxQty: number; // the most one request may ask for — see MAX_PER_LINE
  isBooked: boolean; // tracked item she owns none of right now — see note below
  colors: string[]; // color slugs, for the swatch filter
  swatches: PlpSwatch[]; // the colours to choose from; [] = no colour choice
  imagePath: string | null; // first image, or null -> tinted placeholder
  fullImagePath: string | null; // the same photo uncropped, for the full-size view
  carousel: ProductImage[]; // variation photos; when any, the card shows these instead
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

// The most of one product a single request may carry. Must match MAX_QTY in
// src/app/actions.ts, which rejects anything above it. A tracked product is also
// capped by how many she owns; balloons and other consumables only by this.
export const MAX_PER_LINE = 20;

// How many of something one request may ask for: what she owns, but never
// more than MAX_PER_LINE. A consumable (null) only by MAX_PER_LINE.
function maxQtyFor(stock: number | null) {
  return stock === null ? MAX_PER_LINE : Math.max(0, Math.min(stock, MAX_PER_LINE));
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
  // The covers are the category a family recommends (arches -> covers).
  const coverCategoryIds = new Set(
    groups.map((group) => group.recommend_category_id).filter(Boolean),
  );

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

      // The card's own photo: one not tied to a colour, if she has one — it is
      // what a colour without photos falls back to.
      const images = product.images ?? [];
      const mainImage = images.find((image) => image.color_id === null) ?? images[0];

      products.push({
        id: product.id,
        slug: product.slug,
        name: product.name,
        spec: product.description ?? "",
        categorySlug: group.slug,
        categoryName: group.name,
        price: priceOf(product),
        rentable: product.offer_mode !== "setup",
        setupPossible: product.offer_mode !== "rent",
        coversNeeded: product.covers_needed,
        isCover: coverCategoryIds.has(group.id),
        asksRequirements: product.asks_requirements ?? false,
        stock: product.track_availability ? product.quantity : null,
        maxQty: maxQtyFor(product.track_availability ? product.quantity : null),
        // Without the confirmed-bookings query wired (see the availability note
        // in PLP-BRIEF.md), the only honest "unavailable" signal is a tracked
        // product she currently owns none of. Real per-date availability is a
        // follow-up; this keeps the "Заето" card state driven by real data.
        // With colours, quantity is their sum: booked = every colour is out.
        isBooked: product.track_availability && product.quantity <= 0,
        colors: product.colors.map((color) => color.color_slug),
        swatches: product.colors.map((color) => {
          const stock = product.track_availability ? color.quantity : null;
          return {
            id: color.id,
            slug: color.color_slug,
            name: color.color_name,
            hex: color.hex,
            stock,
            maxQty: maxQtyFor(stock),
            images: images.filter((image) => image.color_id === color.id),
          };
        }),
        imagePath: mainImage?.path ?? null,
        fullImagePath: mainImage ? fullImagePath(mainImage) : null,
        carousel: carouselImages(product, "catalog"),
        tint: tintFor(group.slug),
        createdAt: product.created_at ?? null,
      });
    }
  }

  return { products, categories, colors: [...colorBySlug.values()] };
}

// ---------------------------------------------------------------------- basket

// One basket line's identity: a product, in one colour (or none). The same
// product in two colours is two lines.
export function lineKey(slug: string, color: string | null) {
  return color ? `${slug}::${color}` : slug;
}

export type BasketItem = {
  key: string; // lineKey(slug, color) — one line of the basket
  product: PlpProduct;
  color: string | null; // the colour slug as stored — what the basket store is called with
  swatch: PlpSwatch | null; // that colour; null = a line without a colour
  qty: number;
  maxQty: number; // the colour's limit when there is a colour, else the product's
  lineTotal: number | null; // null = "по запитване"
  requirements: string; // what the customer described; "" = nothing
};

export type BasketView = {
  items: BasketItem[];
  total: number;
  hasQuote: boolean;
};

// Joins the stored basket lines ({slug, color, qty, requirements}) with the catalog. A product
// that is no longer in the catalog is dropped, and so is a colour that is gone
// (deleted, or the product's colours switched off) — kept, it would turn into a
// second line of the same product without a colour. A line saved without a
// colour (from before colours) stays as it is. qty is clamped to what may be
// asked for. "По запитване" lines add nothing to the total — same rule as the
// configurator.
export function basketView(
  lines: BasketLine[],
  products: PlpProduct[],
): BasketView {
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const items: BasketItem[] = [];
  let total = 0;
  let hasQuote = false;

  for (const line of lines) {
    const product = bySlug.get(line.slug);
    if (!product) continue;
    const swatch =
      product.swatches.find((option) => option.slug === line.color) ?? null;
    if (line.color !== null && !swatch) continue;
    const maxQty = swatch ? swatch.maxQty : product.maxQty;
    const qty = Math.max(1, Math.min(line.qty, maxQty || 1));
    const lineTotal = product.price === null ? null : product.price * qty;
    if (lineTotal === null) hasQuote = true;
    else total += lineTotal;
    items.push({
      key: lineKey(line.slug, line.color),
      product,
      color: line.color,
      swatch,
      qty,
      maxQty,
      lineTotal,
      requirements: line.requirements,
    });
  }

  return { items, total, hasQuote };
}

// „Труд за украса“ — added once, as a label, to a basket she sets up: the
// visitor wants „Украса с монтаж“ and every product is one she may set up. A
// basket that can only be rented goes as „Само под наем“ whatever was picked,
// so it gets none. The same rule as the mode /request settles on.
export function hasLabour(items: BasketItem[], wantsSetUp: boolean) {
  if (items.length === 0) return false;
  const canSetUp = items.every((item) => item.product.setupPossible);
  const canRent = items.every((item) => item.product.rentable);
  return canSetUp && (wantsSetUp || !canRent);
}

// Arches need covers: a warning when the basket holds fewer covers than its
// arches need. null = enough (or no arches). A hint, never a block.
export function coverShortfall(items: BasketItem[]) {
  let needed = 0;
  let have = 0;
  for (const { product, qty } of items) {
    needed += qty * product.coversNeeded;
    if (product.isCover) have += qty;
  }
  return have < needed ? { needed, have } : null;
}

// The line under a cover or an arch saying how they go together.
export function coverLabel(product: PlpProduct) {
  if (product.isCover) return "1 бр. е за 1 арка";
  if (product.coversNeeded === 1) return "Нужен е 1 калъф";
  if (product.coversNeeded > 1) return `Нужни са ${product.coversNeeded} калъфа`;
  return null;
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
// filter, and neither is the mode: it has its own switch at the top.
export function activeFilterCount(state: FilterState) {
  return state.cats.length + state.colors.length + state.bands.length;
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

// The address of a view. Exactly one category = its own page,
// /catalog/arches, which is the URL search engines index for it; everything
// else is /catalog plus the query string.
export function catalogHref(state: FilterState) {
  if (state.cats.length === 1) {
    return `/catalog/${state.cats[0]}${buildQuery({ ...state, cats: [] })}`;
  }
  return `/catalog${buildQuery(state)}`;
}
