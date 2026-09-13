// Database row types, mirroring schema.sql. Add the rest as we start using them.

export type Category = {
  id: string;
  slug: string;
  name: string;
  sort: number;
};

export type ProductColor = {
  id: string;
  color_slug: string;
  color_name: string;
  hex: string | null; // null = pattern swatch (e.g. "Замък на Елза")
  sort: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  base_price: number | null;
  pricing_type: "fixed" | "custom_quote";
  colors: ProductColor[];
};

// A category plus its products — this is what the configurator renders,
// one ItemCard per group.
export type CatalogGroup = {
  id: string;
  slug: string;
  name: string;
  products: Product[];
};
