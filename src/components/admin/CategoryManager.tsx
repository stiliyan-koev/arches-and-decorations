"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slug";
import { deleteCategory, saveCategory } from "@/app/admin/actions";
import type { CategorySummary } from "@/lib/types";

const FIELD = "rounded-item border border-border-strong bg-bg px-3 py-2";

type Props = {
  categories: CategorySummary[];
  counts: Record<string, number>; // products per category id
};

export default function CategoryManager({ categories, counts }: Props) {
  const [error, setError] = useState("");

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-item bg-booked/10 px-3 py-2 text-[0.85rem] font-bold text-booked">
          {error}
        </p>
      )}

      {categories.map((category) => (
        <CategoryRow
          key={category.id}
          category={category}
          count={counts[category.id] ?? 0}
          onError={setError}
        />
      ))}

      <NewCategoryRow onError={setError} />
    </div>
  );
}

function CategoryRow({
  category,
  count,
  onError,
}: {
  category: CategorySummary;
  count: number;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);
  const [sort, setSort] = useState(String(category.sort));
  const [description, setDescription] = useState(category.description ?? "");
  const [busy, setBusy] = useState(false);

  const dirty =
    name !== category.name ||
    slug !== category.slug ||
    sort !== String(category.sort) ||
    description !== (category.description ?? "");

  async function handleSave() {
    setBusy(true);
    onError("");

    const result = await saveCategory({
      id: category.id,
      name,
      slug,
      sort: Number(sort) || 0,
      description,
    });

    setBusy(false);
    if (!result.ok) return onError(result.error);
    router.refresh();
  }

  async function handleDelete() {
    if (count > 0) {
      onError(
        `„${category.name}“ още има ${count} продукта. Преместете ги първо.`,
      );
      return;
    }
    if (!confirm(`Да изтрия категория „${category.name}“?`)) return;

    setBusy(true);
    const result = await deleteCategory(category.id);
    setBusy(false);

    if (!result.ok) return onError(result.error);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-3">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className={`${FIELD} min-w-[10rem] flex-1 font-bold`}
      />
      <input
        value={slug}
        onChange={(event) => setSlug(slugify(event.target.value))}
        className={`${FIELD} w-40 text-[0.85rem] text-muted`}
      />
      <input
        type="number"
        value={sort}
        onChange={(event) => setSort(event.target.value)}
        aria-label="Подредба"
        className={`${FIELD} w-20`}
      />
      <span className="w-24 text-[0.8rem] text-muted">{count} продукта</span>

      <button
        type="button"
        onClick={handleSave}
        disabled={busy || !dirty}
        className="cursor-pointer rounded-full bg-cta px-4 py-2 text-[0.85rem] font-extrabold text-white hover:bg-cta-strong disabled:opacity-40"
      >
        Запази
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="cursor-pointer px-2 text-[0.85rem] font-extrabold text-booked hover:underline disabled:opacity-50"
      >
        Изтрий
      </button>
      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        maxLength={300}
        rows={2}
        placeholder="Текст под заглавието в каталога, напр. „Калъфи за арките ни — по един за всяка арка.“"
        aria-label="Текст за категорията"
        className={`${FIELD} w-full text-[0.9rem]`}
      />
    </div>
  );
}

function NewCategoryRow({ onError }: { onError: (message: string) => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    setBusy(true);
    onError("");

    const result = await saveCategory({
      name,
      slug: slugify(name),
      sort: 99,
    });

    setBusy(false);
    if (!result.ok) return onError(result.error);

    setName("");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-card border border-dashed border-border-strong p-3">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Нова категория"
        className={`${FIELD} min-w-[12rem] flex-1`}
      />
      {name.trim() && (
        <code className="text-[0.8rem] text-muted">{slugify(name)}</code>
      )}
      <button
        type="button"
        onClick={handleAdd}
        disabled={busy || !name.trim()}
        className="cursor-pointer rounded-full bg-cta px-4 py-2 text-[0.85rem] font-extrabold text-white hover:bg-cta-strong disabled:opacity-40"
      >
        Добави
      </button>
    </div>
  );
}
