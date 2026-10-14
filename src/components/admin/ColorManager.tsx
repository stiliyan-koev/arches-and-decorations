"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slug";
import { addColor, deleteColor, setColorQuantity } from "@/app/admin/actions";
import { PATTERN_FILL } from "@/components/Swatches";
import type { ProductColor } from "@/lib/types";

type Props = {
  productId: string;
  colors: ProductColor[];
  // Balloons and other consumables never run out, so they have no counts.
  trackAvailability: boolean;
};

const COUNT_FIELD =
  "w-20 rounded-item border border-border-strong bg-bg px-3 py-2 tabular-nums";

// The little round fill next to a colour's name. A pattern (no hex) gets
// the same stripes as on the site.
function Dot({ color }: { color: ProductColor }) {
  return (
    <span
      className="h-5 w-5 shrink-0 rounded-full border border-border-strong"
      style={{ background: color.hex ?? PATTERN_FILL }}
    />
  );
}

export default function ColorManager({ productId, colors, trackAvailability }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#ffffff");
  const [isPattern, setIsPattern] = useState(false);
  const [quantity, setQuantity] = useState("1");
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
      // A consumable has no count; 1 just fills the column.
      quantity: trackAvailability ? Number(quantity) : 1,
    });

    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setName("");
    setIsPattern(false);
    setQuantity("1");
    router.refresh();
  }

  async function handleDelete(color: ProductColor) {
    if (
      !confirm(
        `Да изтрия цвета „${color.color_name}“? Снимките му остават към продукта, за всички цветове.`,
      )
    )
      return;

    setBusy(true);
    const result = await deleteColor(color.id);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  // Saves a colour's count when she leaves the box. False puts the box back.
  async function handleCount(color: ProductColor, value: string) {
    const next = Number(value);
    if (value.trim() === "" || next === color.quantity) return true;

    setBusy(true);
    setError("");
    let result;
    try {
      result = await setColorQuantity(color.id, next);
    } catch {
      result = { ok: false as const, error: "Запазването се провали. Опитайте отново." };
    }
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="text-lg">Цветове</h2>
      <p className="mt-1 text-[0.85rem] text-muted">
        Всеки цвят става кръгче на картата в каталога; първият е избран
        отначало. Кръгчетата се виждат на сайта само след като „Има
        варианти по цвят“ е отметнато горе — дотогава цветовете и бройките
        им се запазват, но не се показват никъде. Снимка за цвят се избира в
        „Снимки“ отдолу.
        {trackAvailability &&
          " Броят е колко бройки от този цвят имате — наличността се води за всеки цвят поотделно."}
      </p>

      {colors.length > 0 && trackAvailability && (
        <ul className="mt-4 divide-y divide-border rounded-item border border-border">
          {colors.map((color) => (
            <li key={color.id} className="flex items-center gap-3 px-3 py-2">
              <Dot color={color} />
              <span className="min-w-0 flex-1 truncate text-[0.9rem] font-bold">
                {color.color_name}
              </span>
              <CountInput
                color={color}
                disabled={busy}
                onSave={(value) => handleCount(color, value)}
              />
              <button
                type="button"
                onClick={() => handleDelete(color)}
                disabled={busy}
                aria-label={`Изтрий ${color.color_name}`}
                className="cursor-pointer px-1 text-lg text-muted hover:text-booked disabled:opacity-50"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {colors.length > 0 && !trackAvailability && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {colors.map((color) => (
            <li
              key={color.id}
              className="flex items-center gap-2 rounded-full border border-border-strong py-1 pr-2 pl-1.5"
            >
              <Dot color={color} />
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

      {colors.length === 0 && (
        <p className="mt-4 rounded-item border border-dashed border-border-strong px-4 py-4 text-center text-[0.9rem] text-muted">
          Още няма цветове. Докато няма, продуктът се показва без кръгчета.
        </p>
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

        {trackAvailability && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.78rem] font-extrabold tracking-[0.08em] text-muted uppercase">
              Брой
            </span>
            <input
              type="number"
              min="0"
              max="999"
              step="1"
              inputMode="numeric"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={`${COUNT_FIELD} py-2.5`}
            />
          </label>
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
          disabled={busy || !name.trim() || (trackAvailability && quantity.trim() === "")}
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

// One colour's count. Saved when she leaves the box (or presses Enter), so
// typing "12" doesn't save "1" first.
function CountInput({
  color,
  disabled,
  onSave,
}: {
  color: ProductColor;
  disabled: boolean;
  onSave: (value: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState(String(color.quantity));

  async function save() {
    const ok = await onSave(value);
    if (!ok || value.trim() === "") setValue(String(color.quantity));
  }

  return (
    <label className="flex items-center gap-2 text-[0.8rem] text-muted">
      бр.
      <input
        type="number"
        min="0"
        max="999"
        step="1"
        inputMode="numeric"
        aria-label={`Брой — ${color.color_name}`}
        disabled={disabled}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className={COUNT_FIELD}
      />
    </label>
  );
}
