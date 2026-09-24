import { createClient } from "@/lib/supabase/server";
import CategoryManager from "@/components/admin/CategoryManager";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();

  const [categoriesResult, productsResult] = await Promise.all([
    supabase.from("categories").select("id, slug, name, sort").order("sort"),
    supabase.from("products").select("category_id"),
  ]);
  if (categoriesResult.error || productsResult.error) throw categoriesResult.error ?? productsResult.error;

  // Deleting a category that still holds products would orphan them (the FK is
  // `on delete set null`), so the row shows the count and refuses.
  const counts: Record<string, number> = {};
  for (const product of productsResult.data ?? []) {
    if (product.category_id) {
      counts[product.category_id] = (counts[product.category_id] ?? 0) + 1;
    }
  }

  return (
    <>
      <h1 className="text-2xl">Категории</h1>
      <p className="mt-1 mb-6 text-[0.9rem] text-muted">
        Подредбата определя реда на табовете в конфигуратора.
      </p>

      <CategoryManager categories={categoriesResult.data ?? []} counts={counts} />
    </>
  );
}
