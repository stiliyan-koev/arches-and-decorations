import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/images";
import { formatPrice, QUOTE_LABEL } from "@/lib/format";
import { PATTERN_FILL } from "@/components/Swatches";
import LabourPriceForm from "@/components/admin/LabourPriceForm";
import { getLabourPrice } from "@/lib/settings";

type ProductListRow = {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  base_price: number | null;
  pricing_type: "fixed" | "custom_quote";
  quantity: number;
  track_availability: boolean;
  active: boolean;
  sort: number;
  has_colors: boolean;
  product_images: { path: string; sort: number; in_carousel: boolean }[];
  product_colors: { id: string; color_name: string; hex: string | null; quantity: number; sort: number }[];
};

export default async function AdminProductsPage() {
  const supabase = await createClient();

  const [categoriesResult, productsResult, labourPrice] = await Promise.all([
    supabase.from("categories").select("id, name, sort").order("sort"),
    supabase
      .from("products")
      .select(
        `id, name, slug, category_id, base_price, pricing_type, quantity,
         track_availability, active, sort, has_colors,
         product_images ( path, sort, in_carousel ),
         product_colors ( id, color_name, hex, quantity, sort )`,
      )
      .order("sort"),
    getLabourPrice(),
  ]);
  if (categoriesResult.error || productsResult.error) throw categoriesResult.error ?? productsResult.error;

  const categories = categoriesResult.data ?? [];
  const products = (productsResult.data ?? []) as ProductListRow[];

  // A product whose category was deleted still has to be reachable, so the
  // uncategorised bucket is always last rather than hidden.
  const groups = [
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
      products: products.filter((p) => p.category_id === category.id),
    })),
    {
      id: "none",
      name: "Без категория",
      products: products.filter(
        (p) => !categories.some((c) => c.id === p.category_id),
      ),
    },
  ].filter((group) => group.products.length > 0);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl">Продукти</h1>
        <Link
          href="/admin/products/new"
          className="ml-auto rounded-full bg-cta px-5 py-2.5 font-extrabold text-white hover:bg-cta-strong"
        >
          + Нов продукт
        </Link>
      </div>

      <LabourPriceForm price={labourPrice} />

      {groups.length === 0 && (
        <p className="mt-8 text-muted">Още няма продукти.</p>
      )}

      {groups.map((group) => (
        <section key={group.id} className="mt-8">
          <h2 className="text-[0.78rem] font-extrabold tracking-[0.12em] text-cta uppercase">
            {group.name}
          </h2>

          <ul className="mt-3 space-y-2">
            {group.products.map((product) => {
              // The main photo, or the first carousel photo if that's all it has.
              const sorted = [...product.product_images].sort(
                (a, b) => a.sort - b.sort,
              );
              const cover =
                sorted.find((image) => !image.in_carousel) ?? sorted[0];
              // Hidden colours (switch off) don't count, like on the site. A
              // tracked product's stock is its colours' counts added up; a
              // consumable (balloons) has no counts to add.
              const colors = product.has_colors
                ? [...product.product_colors].sort((a, b) => a.sort - b.sort)
                : [];
              const quantity =
                colors.length && product.track_availability
                  ? colors.reduce((sum, color) => sum + color.quantity, 0)
                  : product.quantity;

              return (
                <li key={product.id}>
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="flex items-center gap-4 rounded-card border border-border bg-surface p-3 hover:border-cta"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-item bg-surface-2">
                      {cover ? (
                        <Image
                          src={imageUrl(cover.path)}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[0.65rem] font-bold text-muted">
                          няма
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold">{product.name}</p>
                      <p className="truncate text-[0.8rem] text-muted">
                        {product.slug} · {product.product_images.length} снимки
                      </p>
                      {colors.length > 0 && (
                        <p className="mt-1 flex items-center gap-1">
                          {colors.map((color) => (
                            <span
                              key={color.id}
                              title={color.color_name}
                              className="h-3.5 w-3.5 shrink-0 rounded-full border border-border-strong"
                              style={{ background: color.hex ?? PATTERN_FILL }}
                            />
                          ))}
                          <span className="ml-1 text-[0.75rem] text-muted">
                            {colors.length === 1 ? "1 цвят" : `${colors.length} цвята`}
                          </span>
                        </p>
                      )}
                    </div>

                    <span className="hidden w-24 text-[0.85rem] font-bold sm:block">
                      {product.pricing_type === "custom_quote"
                        ? QUOTE_LABEL
                        : formatPrice(product.base_price ?? 0)}
                    </span>

                    <span className="hidden w-16 text-[0.85rem] text-muted md:block">
                      бр. {quantity}
                    </span>

                    {!product.active && (
                      <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[0.7rem] font-extrabold text-muted">
                        Скрит
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
