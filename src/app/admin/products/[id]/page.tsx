import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "@/components/admin/ProductForm";
import ColorManager from "@/components/admin/ColorManager";
import PhotoManager from "@/components/admin/PhotoManager";
import CarouselManager from "@/components/admin/CarouselManager";
import type { ProductColor, ProductImage, ProductRow } from "@/lib/types";

type ProductDetail = ProductRow & {
  product_colors: ProductColor[];
  product_images: ProductImage[];
};

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const [productResult, categoriesResult] = await Promise.all([
    supabase
      .from("products")
      .select(
        `id, category_id, slug, name, description, base_price, pricing_type,
         quantity, track_availability, rentable, service_only, active, sort,
         carousel, carousel_in_configurator, carousel_in_catalog,
         product_colors ( id, color_slug, color_name, hex, sort ),
         product_images ( id, color_id, path, full_path, crop, in_carousel, sort )`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("id, slug, name, sort").order("sort"),
  ]);
  if (productResult.error || categoriesResult.error) throw productResult.error ?? categoriesResult.error;

  const product = productResult.data as ProductDetail | null;
  if (!product) notFound();

  const colors = [...product.product_colors].sort((a, b) => a.sort - b.sort);
  const images = [...product.product_images].sort((a, b) => a.sort - b.sort);
  const mainImages = images.filter((image) => !image.in_carousel);
  const carouselImages = images.filter((image) => image.in_carousel);

  return (
    <>
      <Link
        href="/admin/products"
        className="text-[0.85rem] font-bold text-muted hover:text-cta"
      >
        ← Всички продукти
      </Link>

      <h1 className="mt-3 mb-6 text-2xl">{product.name}</h1>

      <div className="space-y-5">
        <ProductForm product={product} categories={categoriesResult.data ?? []} />
        <ColorManager productId={product.id} colors={colors} />
        <PhotoManager
          productId={product.id}
          productSlug={product.slug}
          colors={colors}
          images={mainImages}
        />
        <CarouselManager
          productId={product.id}
          productSlug={product.slug}
          settings={{
            carousel: product.carousel,
            carousel_in_configurator: product.carousel_in_configurator,
            carousel_in_catalog: product.carousel_in_catalog,
          }}
          images={carouselImages}
        />
      </div>
    </>
  );
}
