import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { CatalogGroup } from "@/lib/types";

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

// The catalog for every page that shows it. With no database, or on a database
// error, it is empty and the pages say „Очаквайте скоро“.
//
// There used to be a hardcoded stand-in here (catalog-fallback.ts, a snapshot
// of seed.sql). It is gone, as CLAUDE.md asks once the real database is live:
// the live catalog has been edited through the admin since September 2026, so
// the snapshot had drifted into showing customers products and prices that no
// longer exist — and its ids are slugs rather than UUIDs, so submitRequest
// rejected every request built from it anyway. An empty catalog is visibly
// wrong; a stale one is not. The error is thrown inside the cache below and
// caught here, so a hiccup is never cached as the catalog.
export async function getCatalog(): Promise<CatalogGroup[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    return await readCatalog();
  } catch (error) {
    // Without this line a missing table reads as "no products yet" on the page.
    console.error("getCatalog: showing an empty catalog", error);
    return [];
  }
}

// Reads the whole catalog in one go — it's a handful of rows and the homepage
// configurator needs all of it. Returns categories with their products and
// each product's colours, ordered by the `sort` columns from schema.sql.
//
// Cached for 5 minutes across visits, so /catalog doesn't wait on the database
// every time. An admin write clears it at once through the "catalog" tag below
// (revalidateCatalog in admin/actions.ts, via updateTag) — the tag rather than
// revalidatePath
// alone, which only reaches entries created while rendering the paths it names.
// The cookie-free client, because a cached read can't touch cookies(); the
// catalog tables are public-read anyway.
const readCatalog = unstable_cache(async (): Promise<CatalogGroup[]> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("categories")
    .select(
      `id, slug, name, sort,
       in_configurator, description, add_label, picker,
       recommend_category_id, recommend_title, recommend_hint, recommend_label,
       products (
         id, slug, name, description, option_group, base_price, pricing_type,
         active, sort, created_at,
         quantity, track_availability, offer_mode, covers_needed,
         carousel, carousel_in_configurator, carousel_in_catalog, has_colors,
         asks_requirements,
         product_colors ( id, color_slug, color_name, hex, quantity, sort ),
         product_images ( id, color_id, path, full_path, in_carousel, sort, photo:photos ( path ) )
       )`,
    )
    .order("sort")
    .order("sort", { referencedTable: "products" });

  if (error) throw error;

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
          offer_mode: product.offer_mode,
          covers_needed: product.covers_needed,
          asks_requirements: product.asks_requirements,
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
  return groups.filter((group) => group.products.length > 0);
}, ["catalog"], { revalidate: 300, tags: ["catalog"] });
