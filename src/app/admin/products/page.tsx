import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/images";
import { formatPrice, QUOTE_LABEL } from "@/lib/format";

type ProductListRow = {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  base_price: number | null;
  pricing_type: "fixed" | "custom_quote";
  quantity: number;
  active: boolean;
  sort: number;
  product_images: { path: string; sort: number }[];
};

export default async function AdminProductsPage() {
  const supabase = await createClient();

  const [categoriesResult, productsResult] = await Promise.all([
    supabase.from("categories").select("id, name, sort").order("sort"),
    supabase
      .from("products")
      .select(
        `id, name, slug, category_id, base_price, pricing_type, quantity,
         active, sort, product_images ( path, sort )`,
      )
      .order("sort"),
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
              const cover = [...product.product_images].sort(
                (a, b) => a.sort - b.sort,
              )[0];

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
                    </div>

                    <span className="hidden w-24 text-[0.85rem] font-bold sm:block">
                      {product.pricing_type === "custom_quote"
                        ? QUOTE_LABEL
                        : formatPrice(product.base_price ?? 0)}
                    </span>

                    <span className="hidden w-16 text-[0.85rem] text-muted md:block">
                      бр. {product.quantity}
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
