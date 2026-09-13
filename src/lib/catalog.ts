import { createClient } from "@/lib/supabase/server";
import { FALLBACK_GROUPS } from "@/lib/catalog-fallback";
import type { CatalogGroup } from "@/lib/types";

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

// Reads the whole catalog in one go — it's a handful of rows and the homepage
// configurator needs all of it. Returns categories with their products and
// each product's colours, ordered by the `sort` columns from schema.sql.
export async function getCatalog(): Promise<CatalogGroup[]> {
  if (!isSupabaseConfigured()) return FALLBACK_GROUPS;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(
      `id, slug, name, sort,
       products (
         id, slug, name, base_price, pricing_type, active, sort,
         product_colors ( id, color_slug, color_name, hex, sort )
       )`,
    )
    .order("sort")
    .order("sort", { referencedTable: "products" });

  if (error || !data?.length) return FALLBACK_GROUPS;

  const groups: CatalogGroup[] = data.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    products: category.products
      .filter((product) => product.active)
      .map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        base_price: product.base_price,
        pricing_type: product.pricing_type,
        colors: [...product.product_colors].sort((a, b) => a.sort - b.sort),
      })),
  }));

  // A category with no products has nothing to configure.
  const usable = groups.filter((group) => group.products.length > 0);
  return usable.length ? usable : FALLBACK_GROUPS;
}
