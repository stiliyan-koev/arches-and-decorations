"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slug";
import { deleteProduct, saveProduct } from "@/app/admin/actions";
import type { CategorySummary, OfferMode, ProductRow } from "@/lib/types";

type Props = {
  product: ProductRow | null; // null = creating a new one
  categories: CategorySummary[];
  colorCount?: number; // how many colours the product has; the new-product page has none
};

const FIELD =
  "w-full rounded-item border border-border-strong bg-bg px-3 py-2.5";
const LABEL =
  "block text-[0.78rem] font-extrabold tracking-[0.08em] text-muted uppercase";

export default function ProductForm({ product, categories, colorCount = 0 }: Props) {
  const router = useRouter();
  const isNew = !product;

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [pricingType, setPricingType] = useState(
    product?.pricing_type ?? "fixed",
  );
  const [basePrice, setBasePrice] = useState(
    product?.base_price != null ? String(product.base_price) : "",
  );
  const [quantity, setQuantity] = useState(String(product?.quantity ?? 1));
  const [trackAvailability, setTrackAvailability] = useState(
    product?.track_availability ?? true,
  );
  const [offerMode, setOfferMode] = useState<OfferMode>(
    product?.offer_mode ?? "both",
  );
  const [coversNeeded, setCoversNeeded] = useState(
    String(product?.covers_needed ?? 0),
  );
  const [active, setActive] = useState(product?.active ?? true);
  const [sort, setSort] = useState(String(product?.sort ?? 0));
  const [hasColors, setHasColors] = useState(product?.has_colors ?? false);
  const [asksRequirements, setAsksRequirements] = useState(
    product?.asks_requirements ?? false,
  );
  const countByColor = hasColors && colorCount > 0;

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // While she's typing a new product's name the slug follows along; the moment
  // she edits the slug herself it stops, and on an existing product it never
  // follows the name. She can still change it by hand, but photos already
  // uploaded stay in the folder named after the old slug.
  function handleName(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);

    const result = await saveProduct({
      id: product?.id,
      category_id: categoryId || null,
      slug,
      name,
      description,
      base_price: basePrice ? Number(basePrice) : null,
      pricing_type: pricingType,
      quantity: Number(quantity) || 0,
      track_availability: trackAvailability,
      offer_mode: offerMode,
      covers_needed: Number(coversNeeded) || 0,
      active,
      sort: Number(sort) || 0,
      has_colors: hasColors,
      asks_requirements: asksRequirements,
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    // A new product has nowhere to put photos until it exists — send her
    // straight to its editor, where the colour and photo panels live.
    if (isNew && result.id) {
      router.push(`/admin/products/${result.id}`);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  async function handleDelete() {
    if (!product) return;
    if (!confirm(`Да изтрия „${product.name}“ заедно със снимките?`)) return;

    setBusy(true);
    const result = await deleteProduct(product.id);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/admin/products");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-card border border-border bg-surface p-5"
    >
      <h2 className="text-lg">{isNew ? "Нов продукт" : "Основни данни"}</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className={LABEL}>Име</span>
          <input
            required
            value={name}
            onChange={(event) => handleName(event.target.value)}
            className={`mt-1.5 ${FIELD}`}
          />
        </label>

        <label>
          <span className={LABEL}>Slug (в адреса и имената на файловете)</span>
          <input
            required
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(slugify(event.target.value));
            }}
            className={`mt-1.5 ${FIELD}`}
          />
        </label>

        <label>
          <span className={LABEL}>Категория</span>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className={`mt-1.5 ${FIELD}`}
          >
            <option value="">— без категория —</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="sm:col-span-2">
          <span className={LABEL}>Описание (по желание)</span>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={`mt-1.5 ${FIELD}`}
          />
          <span className="mt-1 block text-[0.8rem] text-muted">
            На картата се вижда само първият ред. Ако има още редове, до него
            излиза (i) и те се отварят с натискане.
          </span>
        </label>

        <label>
          <span className={LABEL}>Цена</span>
          <select
            value={pricingType}
            onChange={(event) =>
              setPricingType(event.target.value as "fixed" | "custom_quote")
            }
            className={`mt-1.5 ${FIELD}`}
          >
            <option value="fixed">Фиксирана цена</option>
            <option value="custom_quote">По запитване</option>
          </select>
        </label>

        <label>
          <span className={LABEL}>Сума (€)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            required={pricingType === "fixed"}
            disabled={pricingType === "custom_quote"}
            value={pricingType === "custom_quote" ? "" : basePrice}
            onChange={(event) => setBasePrice(event.target.value)}
            className={`mt-1.5 ${FIELD} disabled:opacity-50`}
          />
        </label>

        {/* Once the product has colours, every colour has its own count
            (panel „Цветове“) and the product is their sum, so this number
            isn't used. Until the first colour is added, it still is. */}
        <label>
          <span className={LABEL}>
            {countByColor ? "Брой (води се по цветове)" : "Брой, с които разполагаме"}
          </span>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            disabled={countByColor}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={`mt-1.5 ${FIELD} disabled:opacity-50`}
          />
        </label>

        <label>
          <span className={LABEL}>Как се предлага</span>
          <select
            value={offerMode}
            onChange={(event) => setOfferMode(event.target.value as OfferMode)}
            className={`mt-1.5 ${FIELD}`}
          >
            <option value="rent">Може под наем</option>
            <option value="both">С монтаж от нас</option>
            <option value="setup">Само с монтаж от нас</option>
          </select>
          {/* The three read like loose hints, but the choice decides which
              catalog mode lists the product, whether „Труд за украса“ lands on
              a basket holding it, and what it can be sent next to. */}
          <span className="mt-1 block text-[0.8rem] text-muted">
            „Може под наем“ = само наем, не го монтираме. „С монтаж от нас“ = и
            наем, и монтаж. „Само с монтаж от нас“ = не се дава под наем.
          </span>
        </label>

        <label>
          <span className={LABEL}>Нужни калъфи (бр.)</span>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={coversNeeded}
            onChange={(event) => setCoversNeeded(event.target.value)}
            className={`mt-1.5 ${FIELD}`}
          />
          <span className="mt-1 block text-[0.8rem] text-muted">
            За 1 брой от продукта: арка 1, комплект от 2 арки 2, останалото 0.
          </span>
        </label>

        <label>
          <span className={LABEL}>Подредба (по-малко = по-напред)</span>
          <input
            type="number"
            step="1"
            inputMode="numeric"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className={`mt-1.5 ${FIELD}`}
          />
        </label>
      </div>

      <div className="mt-5 grid gap-2.5 text-[0.9rem] font-bold sm:grid-cols-2">
        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Показвай в сайта
        </label>

        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={trackAvailability}
            onChange={(event) => setTrackAvailability(event.target.checked)}
          />
          Следи наличността
          <span className="font-normal text-muted">
            (изключено за балони)
          </span>
        </label>

        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={hasColors}
            onChange={(event) => setHasColors(event.target.checked)}
          />
          Има варианти по цвят
        </label>

        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={asksRequirements}
            onChange={(event) => setAsksRequirements(event.target.checked)}
          />
          Прозорец за изисквания
        </label>
      </div>

      {hasColors && (
        <p className="mt-2 text-[0.85rem] text-muted">
          Цветовете и бройките им се добавят в панела „Цветове“ след
          запазване. В каталога се показват като кръгчета, а снимките се
          свързват с цвят в „Снимки“.
        </p>
      )}

      {asksRequirements && (
        <p className="mt-2 text-[0.85rem] text-muted">
          При „Добави“ в каталога клиентът вижда поле „Опишете вашите
          изисквания“ (напр. текста за надпис). Написаното идва със
          запитването, при артикула.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-item bg-booked/10 px-3 py-2 text-[0.85rem] font-bold text-booked">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="cursor-pointer rounded-full bg-cta px-6 py-2.5 font-extrabold text-white hover:bg-cta-strong disabled:opacity-60"
        >
          {busy ? "Запазване…" : isNew ? "Създай продукта" : "Запази"}
        </button>

        {saved && (
          <span className="text-[0.85rem] font-bold text-available">
            Запазено ✓
          </span>
        )}

        {!isNew && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="ml-auto cursor-pointer text-[0.85rem] font-extrabold text-booked hover:underline disabled:opacity-50"
          >
            Изтрий продукта
          </button>
        )}
      </div>
    </form>
  );
}
