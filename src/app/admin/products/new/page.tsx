import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, slug, name, sort")
    .order("sort");

  return (
    <>
      <Link
        href="/admin/products"
        className="text-[0.85rem] font-bold text-muted hover:text-cta"
      >
        ← Всички продукти
      </Link>

      <h1 className="mt-3 mb-6 text-2xl">Нов продукт</h1>

      <ProductForm product={null} categories={categories ?? []} />

      <p className="mt-4 text-[0.85rem] text-muted">
        Снимките и цветовете се добавят веднага след като създадете продукта.
      </p>
    </>
  );
}
