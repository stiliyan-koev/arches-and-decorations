"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slug";
import { addColor, deleteColor } from "@/app/admin/actions";
import type { ProductColor } from "@/lib/types";

type Props = {
  productId: string;
  colors: ProductColor[];
};

export default function ColorManager({ productId, colors }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#ffffff");
  const [isPattern, setIsPattern] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    setBusy(true);
    setError("");

    const result = await addColor({
      product_id: productId,
      color_slug: slugify(name),
      color_name: name,
      // A pattern swatch (Замък на Елза) has no single colour to show, and the
      // site renders those differently — see catalog-and-images.md.
      hex: isPattern ? null : hex,
    });

    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setName("");
    setIsPattern(false);
    router.refresh();
  }

  async function handleDelete(color: ProductColor) {
    if (!confirm(`Да изтрия цвета „${color.color_name}“ заедно с всичките му снимки?`)) return;

    setBusy(true);
    const result = await deleteColor(color.id);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="text-lg">Цветове</h2>
      <p className="mt-1 text-[0.85rem] text-muted">
        Всеки цвят става отделно квадратче в конфигуратора. Наличността се дели
        между цветовете на един продукт.
      </p>

      {colors.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {colors.map((color) => (
            <li
              key={color.id}
              className="flex items-center gap-2 rounded-full border border-border-strong py-1 pr-2 pl-1.5"
            >
              <span
                className="h-5 w-5 rounded-full border border-border-strong"
                style={
                  color.hex
                    ? { backgroundColor: color.hex }
                    : {
                        backgroundImage:
                          "repeating-linear-gradient(45deg, #ddd 0 4px, #fff 4px 8px)",
                      }
                }
              />
              <span className="text-[0.85rem] font-bold">
                {color.color_name}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(color)}
                disabled={busy}
                aria-label={`Изтрий ${color.color_name}`}
                className="cursor-pointer px-1 text-muted hover:text-booked disabled:opacity-50"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.78rem] font-extrabold tracking-[0.08em] text-muted uppercase">
            Нов цвят
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="напр. Розов"
            className="rounded-item border border-border-strong bg-bg px-3 py-2.5"
          />
        </label>

        {!isPattern && (
          <input
            type="color"
            value={hex}
            onChange={(event) => setHex(event.target.value)}
            aria-label="Цвят на квадратчето"
            className="h-11 w-14 cursor-pointer rounded-item border border-border-strong bg-bg p-1"
          />
        )}

        <label className="flex items-center gap-2 py-3 text-[0.85rem] font-bold">
          <input
            type="checkbox"
            checked={isPattern}
            onChange={(event) => setIsPattern(event.target.checked)}
          />
          Шарка (не е един цвят)
        </label>

        <button
          type="button"
          onClick={handleAdd}
          disabled={busy || !name.trim()}
          className="cursor-pointer rounded-full bg-cta px-5 py-2.5 font-extrabold text-white hover:bg-cta-strong disabled:opacity-50"
        >
          Добави
        </button>
      </div>

      {name.trim() && (
        <p className="mt-2 text-[0.78rem] text-muted">
          slug: <code>{slugify(name) || "—"}</code>
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-item bg-booked/10 px-3 py-2 text-[0.85rem] font-bold text-booked">
          {error}
        </p>
      )}
    </section>
  );
}
