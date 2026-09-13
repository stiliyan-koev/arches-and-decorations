"use client";

import { useState } from "react";
import ItemCard from "@/components/ItemCard";
import Swatches from "@/components/Swatches";
import PriceSummary, {
  type EventFields,
  type SummaryLine,
} from "@/components/PriceSummary";
import { submitRequest, type RequestItem } from "@/app/actions";
import type { CatalogGroup } from "@/lib/types";

// What the visitor has picked for one category.
type Selection = {
  checked: boolean;
  productId: string;
  colorId: string | null;
};

// Mirrors the mockup's sample selection: the first few categories start ticked
// so the visitor lands on a real number instead of 0 лв.
const PRECHECKED_GROUPS = 3;

const FIELD_LABEL =
  "mb-1.5 block text-xs font-extrabold uppercase tracking-[0.06em] text-muted";
const FIELD_INPUT =
  "w-full rounded-[10px] border border-border-strong bg-surface px-[11px] py-2.5 text-[0.95rem] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink/50";

function initialSelections(groups: CatalogGroup[]) {
  const selections: Record<string, Selection> = {};

  groups.forEach((group, index) => {
    const product = group.products[0];
    selections[group.id] = {
      checked: index < PRECHECKED_GROUPS,
      productId: product.id,
      colorId: product.colors[0]?.id ?? null,
    };
  });

  return selections;
}

function priceLabel(price: number | null) {
  return price === null ? "по запитване" : `${price} лв`;
}

export default function Configurator({ groups }: { groups: CatalogGroup[] }) {
  const [selections, setSelections] = useState(() => initialSelections(groups));
  const [customChecked, setCustomChecked] = useState(false);
  const [customText, setCustomText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function update(groupId: string, patch: Partial<Selection>) {
    setSelections((current) => ({
      ...current,
      [groupId]: { ...current[groupId], ...patch },
    }));
  }

  function findProduct(group: CatalogGroup, productId: string) {
    return (
      group.products.find((product) => product.id === productId) ??
      group.products[0]
    );
  }

  // Everything below is derived from `selections` on each render — that's what
  // keeps the total live without any extra bookkeeping.
  const chosen = groups
    .filter((group) => selections[group.id].checked)
    .map((group) => {
      const selection = selections[group.id];
      const product = findProduct(group, selection.productId);
      const color = product.colors.find((c) => c.id === selection.colorId);
      return { group, product, color };
    });

  const total = chosen.reduce(
    (sum, { product }) => sum + (product.base_price ?? 0),
    0,
  );

  const hasQuoteItems =
    customChecked || chosen.some(({ product }) => product.base_price === null);

  const lines: SummaryLine[] = chosen.map(({ group, product, color }) => ({
    key: group.id,
    name: color ? `${product.name} (${color.color_name})` : product.name,
    value: priceLabel(product.base_price),
  }));

  if (customChecked) {
    lines.push({
      key: "custom",
      name: customText.trim() || "Персонализирано",
      value: "по запитване",
    });
  }

  async function handleSubmit(fields: EventFields) {
    setError(null);

    const items: RequestItem[] = chosen.map(({ product, color }) => ({
      productId: product.id,
      colorId: color?.id ?? null,
      customText: null,
      linePrice: product.base_price,
    }));

    if (customChecked) {
      items.push({
        productId: null,
        colorId: null,
        customText: customText.trim() || "Персонализирана заявка",
        linePrice: null,
      });
    }

    setSubmitting(true);
    const result = await submitRequest({
      customerName: fields.customerName,
      phone: fields.phone,
      city: fields.city,
      eventDate: fields.eventDate,
      eventTime: fields.eventTime,
      setup2hBefore: fields.setup2hBefore,
      estimatedTotal: total,
      items,
    });
    setSubmitting(false);

    if (result.ok) {
      setSubmitted(true);
    } else {
      setError(result.error);
    }
  }

  if (submitted) {
    return (
      <div className="relative z-10 mx-auto max-w-xl rounded-card border border-border bg-surface p-8 text-center shadow-card">
        <p className="text-5xl">🎈</p>
        <h2 className="mt-4 text-2xl">Благодарим!</h2>
        <p className="mt-3 text-muted">
          Получихме вашето запитване за{" "}
          <strong className="text-ink">{total} лв</strong> ориентировъчно. Ще се
          свържем с вас по телефона, за да уговорим лична среща.
        </p>
        <p className="mt-4 text-sm text-muted">
          Крайната сума и наличността за вашата дата уточняваме на срещата. Няма
          онлайн плащане и не се обвързвате с нищо.
        </p>
      </div>
    );
  }

  return (
    <div className="relative z-10 grid items-start gap-[22px] lg:grid-cols-[1.55fr_1fr]">
      <div className="rounded-card border border-border bg-surface p-[22px] shadow-card">
        <h2 className="text-[1.15rem]">Твоята украса</h2>
        <p className="mt-1 mb-[18px] text-sm text-muted">
          Маркирай това, което искаш. Цената се преизчислява веднага.
        </p>

        {groups.map((group) => {
          const selection = selections[group.id];
          const product = findProduct(group, selection.productId);

          return (
            <ItemCard
              key={group.id}
              id={`item-${group.slug}`}
              label={group.name}
              priceLabel={priceLabel(product.base_price)}
              isQuote={product.base_price === null}
              checked={selection.checked}
              onToggle={(checked) => update(group.id, { checked })}
            >
              {group.products.length > 1 && (
                <div className="mb-3">
                  <label
                    className={FIELD_LABEL}
                    htmlFor={`select-${group.slug}`}
                  >
                    Избери вариант
                  </label>
                  <select
                    id={`select-${group.slug}`}
                    value={selection.productId}
                    onChange={(event) => {
                      const next = findProduct(group, event.target.value);
                      update(group.id, {
                        productId: next.id,
                        colorId: next.colors[0]?.id ?? null,
                      });
                    }}
                    className={FIELD_INPUT}
                  >
                    {group.products.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} — {priceLabel(option.base_price)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {product.colors.length > 0 && (
                <Swatches
                  colors={product.colors}
                  selectedId={selection.colorId}
                  onSelect={(colorId) => update(group.id, { colorId })}
                  label={`Цвят — ${product.name}`}
                />
              )}
            </ItemCard>
          );
        })}

        <ItemCard
          id="item-custom"
          label="Персонализирана фигурка / надпис"
          priceLabel="по запитване"
          isQuote
          checked={customChecked}
          onToggle={setCustomChecked}
        >
          <label className={FIELD_LABEL} htmlFor="custom-text">
            Опиши какво искаш
          </label>
          <input
            id="custom-text"
            type="text"
            value={customText}
            onChange={(event) => setCustomText(event.target.value)}
            placeholder="напр. фигурка „Спайдърмен“, надпис „Мартин на 5“"
            className={FIELD_INPUT}
          />
        </ItemCard>
      </div>

      <PriceSummary
        lines={lines}
        total={total}
        hasQuoteItems={hasQuoteItems}
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
