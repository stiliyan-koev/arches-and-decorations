import type { CropRect } from "@/lib/resize-image";

// Database row types, mirroring schema.sql. Add the rest as we start using them.

// How a category is chosen in the configurator modal: a dropdown of products,
// a grid of photo cards, or a text box where the customer describes what they
// want (the category's first product is the item — used for balloons).
export type Picker = "dropdown" | "grid" | "text";

// The bare category fields the admin lists and product form need (name/slug/sort
// editing, and the category <select>). Kept separate from the full Category so
// those admin queries don't have to fetch the configurator columns.
export type CategorySummary = {
  id: string;
  slug: string;
  name: string;
  sort: number;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  sort: number;
  in_configurator: boolean;
  description: string | null; // hint line under the family title
  add_label: string | null; // green "add" button label
  picker: Picker;
  recommend_category_id: string | null; // add-on category shown inside the modal
  recommend_title: string | null;
  recommend_hint: string | null;
  recommend_label: string | null;
};

export type ProductColor = {
  id: string;
  color_slug: string;
  color_name: string;
  hex: string | null; // null = pattern swatch (e.g. "Замък на Елза")
  sort: number;
};

export type ProductImage = {
  id: string;
  color_id: string | null; // null = colour-agnostic photo of the product
  path: string; // storage path of the tile (4:5 crop) inside the `catalog` bucket
  full_path: string | null; // whole photo (the library photo), only shrunk. null = old row, use path
  photo_id?: string | null; // the library photo. Admin reads only
  has_original?: boolean; // false = the library only has a cropped copy. Admin reads only
  crop?: CropRect | null; // last crop, in full-photo pixels. Admin reads only
  in_carousel?: boolean; // a carousel photo rather than a main/colour one
  sort: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  option_group: string | null; // configurator first-dropdown grouping (null = skip)
  base_price: number | null;
  pricing_type: "fixed" | "custom_quote";
  quantity: number; // how many she physically owns
  track_availability: boolean; // false = consumable (balloons), always available
  rentable: boolean; // can be loaned out on its own, without her setting it up
  service_only: boolean; // only offered together with setup
  colors: ProductColor[];
  // Optional only because catalog-fallback.ts has no photos. Once that file is
  // deleted this can become required.
  images?: ProductImage[];
  // Variation photos for the carousel, in her order. Already empty when the
  // carousel is switched off; the two flags say where it is shown. Optional
  // for the same reason as `images`.
  carousel_images?: ProductImage[];
  carousel_in_configurator?: boolean;
  carousel_in_catalog?: boolean;
  // Used by the catalog page (PLP): the spec line under a card and the "Най-нови"
  // sort. Optional because the temporary fallback has neither; the configurator
  // ignores both. Once catalog-fallback.ts is deleted these can become required.
  description?: string | null; // BG spec line, e.g. "Метална основа · ⌀ 180 см"
  created_at?: string | null; // ISO timestamp, for newest-first sorting
};

// The full products row, as the admin edits it. `Product` above is the trimmed
// shape the public configurator needs; this one is everything schema.sql has.
export type ProductRow = {
  id: string;
  category_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  base_price: number | null;
  pricing_type: "fixed" | "custom_quote";
  quantity: number;
  track_availability: boolean;
  rentable: boolean;
  service_only: boolean;
  active: boolean;
  sort: number;
  carousel: boolean; // master switch for the carousel photos
  carousel_in_configurator: boolean;
  carousel_in_catalog: boolean;
};

// A category plus its products — this is what the configurator renders, one
// family section per group (those with in_configurator = true). Categories that
// are only add-ons (e.g. covers) still arrive here so a family can resolve its
// recommend_category_id against them.
export type CatalogGroup = {
  id: string;
  slug: string;
  name: string;
  in_configurator: boolean;
  description: string | null;
  add_label: string | null;
  picker: Picker;
  recommend_category_id: string | null;
  recommend_title: string | null;
  recommend_hint: string | null;
  recommend_label: string | null;
  products: Product[];
};
