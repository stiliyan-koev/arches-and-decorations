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
       in_configurator, description, add_label, picker,
       recommend_category_id, recommend_title, recommend_hint, recommend_label,
       products (
         id, slug, name, description, option_group, base_price, pricing_type,
         active, sort, created_at,
         quantity, track_availability, rentable, service_only,
         carousel, carousel_in_configurator, carousel_in_catalog, has_colors,
         product_colors ( id, color_slug, color_name, hex, quantity, sort ),
         product_images ( id, color_id, path, full_path, in_carousel, sort, photo:photos ( path ) )
       )`,
    )
    .order("sort")
    .order("sort", { referencedTable: "products" });

  if (error || !data?.length) {
    // Without this line a missing table reads as "no products yet" on the page.
    console.error("getCatalog: using the hardcoded catalog", error);
    return FALLBACK_GROUPS;
  }

  const groups: CatalogGroup[] = data.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    in_configurator: category.in_configurator,
    description: category.description,
    add_label: category.add_label,
    picker: category.picker,
    recommend_category_id: category.recommend_category_id,
    recommend_title: category.recommend_title,
    recommend_hint: category.recommend_hint,
    recommend_label: category.recommend_label,
    products: category.products
      .filter((product) => product.active)
      .map((product) => {
        // The whole photo is the library photo. full_path is the copy older
        // rows still carry; it goes once migration-photo-library-cleanup.sql runs.
        const images = [...product.product_images]
          .sort((a, b) => a.sort - b.sort)
          .map(({ photo, ...image }) => ({
            ...image,
            // One photo per row; without generated DB types the client can't
            // know that and types it as a list.
            full_path:
              (photo as unknown as { path: string } | null)?.path ?? image.full_path,
          }));
        // With „Има варианти по цвят“ off the colours stay in the database
        // but show nowhere. With it on, every colour has its own count, and
        // the product owns their sum.
        const colors = product.has_colors
          ? [...product.product_colors].sort((a, b) => a.sort - b.sort)
          : [];
        const quantity = colors.length
          ? colors.reduce((sum, color) => sum + color.quantity, 0)
          : product.quantity;
        return {
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description,
          option_group: product.option_group,
          base_price: product.base_price,
          pricing_type: product.pricing_type,
          created_at: product.created_at,
          quantity,
          track_availability: product.track_availability,
          rentable: product.rentable,
          service_only: product.service_only,
          colors,
          // Carousel photos never stand in for the main photo, and stay hidden
          // while the carousel is switched off.
          images: images.filter((image) => !image.in_carousel),
          carousel_images: product.carousel
            ? images.filter((image) => image.in_carousel)
            : [],
          carousel_in_configurator: product.carousel_in_configurator,
          carousel_in_catalog: product.carousel_in_catalog,
        };
      }),
  }));

  // A category with no products has nothing to configure.
  const usable = groups.filter((group) => group.products.length > 0);
  return usable.length ? usable : FALLBACK_GROUPS;
}
