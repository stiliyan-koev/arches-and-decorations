"use client";

import { useEffect, useState, type FormEvent } from "react";
import FamilySection, {
  type TileView,
} from "@/components/configurator/FamilySection";
import EventDetails, {
  type EventFields,
} from "@/components/configurator/EventDetails";
import ContactForm, {
  type ContactFields,
} from "@/components/configurator/ContactForm";
import SummaryRail, {
  type SummaryLine,
} from "@/components/configurator/SummaryRail";
import MobileSummaryBar from "@/components/configurator/MobileSummaryBar";
import OptionModal, {
  type RecommendView,
} from "@/components/configurator/OptionModal";
import type { DropdownOption } from "@/components/configurator/OptionDropdown";
import type { GridChoice } from "@/components/configurator/PhotoGridPicker";
import {
  getReservedQuantities,
  submitRequest,
  type RequestItem,
} from "@/app/actions";
import { formatDate, formatPrice, QUOTE_LABEL } from "@/lib/format";
import { carouselImages, resolvePreviewImage } from "@/lib/images";
import type { CatalogGroup, Product } from "@/lib/types";

// One confirmed selection. A category can hold several, so items carry their own
// id rather than being keyed by product. addon* is the recommended add-on (a
// cover for an arch), null when none was chosen. customText is what the
// customer typed into a 'text' picker (the balloon theme), null when empty.
type ConfItem = {
  uid: string;
  categoryId: string;
  productId: string;
  addonProductId: string | null;
  addonColorId: string | null;
  customText: string | null;
};

// The modal's working copy while adding or editing an item.
type Draft = {
  categoryId: string;
  editUid: string | null;
  optionGroup: string;
  productId: string;
  addonValue: string; // "" | productId | `${productId}::${colorId}`
  customText: string;
};

function parseAddon(value: string) {
  if (!value) return { addonProductId: null, addonColorId: null };
  const [productId, colorId] = value.split("::");
  return { addonProductId: productId, addonColorId: colorId ?? null };
}

function addonValueOf(productId: string | null, colorId: string | null) {
  if (!productId) return "";
  return colorId ? `${productId}::${colorId}` : productId;
}

// The customer's text, cut short enough for a tile or a summary line.
function textSnippet(text: string) {
  const short = text.length > 60 ? `${text.slice(0, 60).trimEnd()}…` : text;
  return `„${short}“`;
}

// The distinct option_group labels among a category's products, in product order.
function optionGroupsOf(category: CatalogGroup): string[] {
  const seen: string[] = [];
  for (const product of category.products) {
    if (product.option_group && !seen.includes(product.option_group)) {
      seen.push(product.option_group);
    }
  }
  return seen;
}

export default function Configurator({ groups }: { groups: CatalogGroup[] }) {
  const [items, setItems] = useState<ConfItem[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [event, setEvent] = useState<EventFields>({
    city: "Варна",
    date: "",
    time: "",
    setup2hBefore: true,
    startDate: "",
    endDate: "",
  });
  const [contact, setContact] = useState<ContactFields>({
    customerName: "",
    phone: "",
    note: "",
  });
  const [availability, setAvailability] = useState<{
    key: string;
    reserved: Record<string, number>;
  }>({ key: "", reserved: {} });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // A category with no products has nothing to configure (same rule as
  // getCatalog). This matters most for a 'text' family: without a product the
  // customer could type a theme but never confirm it.
  const families = groups.filter(
    (group) => group.in_configurator && group.products.length > 0,
  );

  function groupById(id: string | null) {
    return id ? groups.find((group) => group.id === id) : undefined;
  }

  function productById(id: string | null): Product | undefined {
    if (!id) return undefined;
    for (const group of groups) {
      const found = group.products.find((product) => product.id === id);
      if (found) return found;
    }
    return undefined;
  }

  // A service event occupies a single day, so from === to. The answer is stored
  // with the date it was asked about — a changed date invalidates it by itself.
  const hasDate = Boolean(event.date);
  const rangeKey = hasDate ? `${event.date}:${event.date}` : "";
  const reserved = availability.key === rangeKey ? availability.reserved : {};
  const checking = hasDate && availability.key !== rangeKey;

  useEffect(() => {
    if (!rangeKey) return;
    let cancelled = false;

    getReservedQuantities(event.date, event.date)
      .then((map) => {
        if (!cancelled) setAvailability({ key: rangeKey, reserved: map });
      })
      .catch(() => {
        // An unreachable database reads as "nothing booked" — she confirms every
        // request by hand anyway, so a stale count annoys at worst.
        if (!cancelled) setAvailability({ key: rangeKey, reserved: {} });
      });

    return () => {
      cancelled = true;
    };
  }, [rangeKey, event.date]);

  // How many of a product are free on the chosen date (Infinity when untracked),
  // then minus what the current cart already spends on it — both as the main item
  // and as an add-on, since those draw from the same pool.
  function freeQty(product: Product) {
    if (!product.track_availability) return Infinity;
    if (!hasDate) return product.quantity;
    return Math.max(0, product.quantity - (reserved[product.id] ?? 0));
  }

  function usedQty(productId: string, excludeUid: string | null) {
    return items.reduce((sum, item) => {
      if (item.uid === excludeUid) return sum;
      let count = 0;
      if (item.productId === productId) count += 1;
      if (item.addonProductId === productId) count += 1;
      return sum + count;
    }, 0);
  }

  function soldOut(product: Product, excludeUid: string | null) {
    if (!product.track_availability) return false;
    return freeQty(product) - usedQty(product.id, excludeUid) <= 0;
  }

  function priceOf(product: Product | undefined) {
    if (!product) return null;
    if (product.pricing_type === "custom_quote" || product.base_price == null) {
      return null;
    }
    return product.base_price;
  }

  function itemPrice(item: ConfItem): number | null {
    const main = priceOf(productById(item.productId));
    if (main === null) return null; // a quote item stays a quote, add-on or not
    if (!item.addonProductId) return main;
    const addon = priceOf(productById(item.addonProductId));
    if (addon === null) return null; // a quote add-on makes the line a quote
    return main + addon;
  }

  const total = items.reduce((sum, item) => {
    const price = itemPrice(item);
    return price === null ? sum : sum + price;
  }, 0);

  const hasQuoteItems = items.some((item) => itemPrice(item) === null);

  // ---- tiles + summary ----

  function addonMeta(item: ConfItem, label: string) {
    const addon = item.addonProductId ? productById(item.addonProductId) : null;
    if (!addon) return null;
    const color = item.addonColorId
      ? addon.colors.find((c) => c.id === item.addonColorId)
      : null;
    return `${label}: ${color ? color.color_name : addon.name}`;
  }

  function tilesFor(family: CatalogGroup): TileView[] {
    const label = family.recommend_label ?? "Добавка";
    return items
      .filter((item) => item.categoryId === family.id)
      .map((item) => {
        const product = productById(item.productId);
        const addon = item.addonProductId
          ? productById(item.addonProductId)
          : null;
        const meta = [
          product?.option_group,
          product?.name,
          addonMeta(item, label),
          item.customText && textSnippet(item.customText),
        ]
          .filter(Boolean)
          .join(" · ");
        const price = itemPrice(item);
        return {
          uid: item.uid,
          photo: resolvePreviewImage(product, addon, item.addonColorId),
          title: family.name,
          meta,
          priceLabel: price === null ? "По запитване" : formatPrice(price),
          isQuote: price === null,
        };
      });
  }

  const summaryLines: SummaryLine[] = items.map((item) => {
    const family = groupById(item.categoryId);
    const product = productById(item.productId);
    const addon = item.addonProductId ? productById(item.addonProductId) : null;
    const color =
      addon && item.addonColorId
        ? addon.colors.find((c) => c.id === item.addonColorId)
        : null;
    const sub = [
      product?.name,
      color ? color.color_name : addon?.name,
      item.customText && textSnippet(item.customText),
    ]
      .filter(Boolean)
      .join(" · ");
    const price = itemPrice(item);
    return {
      key: item.uid,
      name: family?.name ?? "",
      sub,
      value: price === null ? QUOTE_LABEL : formatPrice(price),
    };
  });

  // ---- modal handlers ----

  function openAdd(categoryId: string) {
    // A 'text' family has nothing to pick: its first product is the item and
    // the customer describes what they want instead.
    const category = groupById(categoryId);
    const productId =
      category?.picker === "text" ? (category.products[0]?.id ?? "") : "";
    setDraft({
      categoryId,
      editUid: null,
      optionGroup: "",
      productId,
      addonValue: "",
      customText: "",
    });
  }

  function openEdit(uid: string) {
    const item = items.find((entry) => entry.uid === uid);
    if (!item) return;
    setDraft({
      categoryId: item.categoryId,
      editUid: uid,
      optionGroup: productById(item.productId)?.option_group ?? "",
      productId: item.productId,
      addonValue: addonValueOf(item.addonProductId, item.addonColorId),
      customText: item.customText ?? "",
    });
  }

  function confirmDraft() {
    if (!draft) return;
    const { addonProductId, addonColorId } = parseAddon(draft.addonValue);
    const item: ConfItem = {
      uid: draft.editUid ?? crypto.randomUUID(),
      categoryId: draft.categoryId,
      productId: draft.productId,
      addonProductId,
      addonColorId,
      customText: draft.customText.trim() || null,
    };
    setItems((current) =>
      draft.editUid
        ? current.map((entry) => (entry.uid === draft.editUid ? item : entry))
        : [...current, item],
    );
    setDraft(null);
  }

  function removeItem(uid: string) {
    setItems((current) => current.filter((entry) => entry.uid !== uid));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDraft(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ---- submit ----

  const stepOneReady = items.length > 0 && hasDate;
  const ctaDisabled =
    step === 1 ? !stepOneReady : submitting || !contact.phone.trim();

  const sendLabel = submitting ? "Изпращане…" : "Изпрати запитване";
  const railCtaLabel = step === 1 ? "Данни за контакт →" : sendLabel;
  const barCtaLabel = step === 1 ? "Напред →" : sendLabel;

  const stepOneHint =
    items.length === 0
      ? "Добавете поне един детайл."
      : !hasDate
        ? "Изберете дата, за да продължим."
        : null;

  async function send() {
    setError(null);

    const requestItems: RequestItem[] = [];
    for (const item of items) {
      requestItems.push({
        productId: item.productId,
        colorId: null,
        qty: 1,
        linePrice: priceOf(productById(item.productId)),
        customText: item.customText,
      });
      // The recommended add-on is its own booking_items row, carrying the
      // chosen colour.
      if (item.addonProductId) {
        requestItems.push({
          productId: item.addonProductId,
          colorId: item.addonColorId,
          qty: 1,
          linePrice: priceOf(productById(item.addonProductId)),
          customText: null,
        });
      }
    }

    setSubmitting(true);
    const result = await submitRequest({
      mode: "service",
      customerName: contact.customerName,
      phone: contact.phone,
      city: event.city,
      note: contact.note,
      eventDate: event.date,
      eventTime: event.time,
      startDate: "",
      endDate: "",
      setup2hBefore: event.setup2hBefore,
      estimatedTotal: total,
      items: requestItems,
    });
    setSubmitting(false);

    if (result.ok) setSubmitted(true);
    else setError(result.error);
  }

  function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (step === 1) {
      setError(null);
      setStep(2);
      return;
    }
    void send();
  }

  if (submitted) {
    return (
      <div className="relative z-10 mx-auto max-w-xl rounded-card border border-border bg-surface p-8 text-center shadow-card">
        <p className="text-5xl">🎈</p>
        <h2 className="mt-4 font-serif text-2xl">Благодарим!</h2>
        <p className="mt-3 text-muted">
          Получихме вашето запитване за{" "}
          <strong className="text-ink">{formatPrice(total)}</strong>{" "}
          ориентировъчно. Ще се свържем с вас по телефона, за да уговорим лична
          среща.
        </p>
        <p className="mt-4 text-sm text-muted">
          Крайната сума и наличността за вашата дата уточняваме на срещата. Няма
          онлайн плащане и не се обвързвате с нищо.
        </p>
      </div>
    );
  }

  return (
    <div className="relative z-10">
      <p className="mb-4 rounded-item border border-border-strong bg-surface px-4 py-2.5 text-center text-sm text-muted">
        Предварителен преглед · Цените са примерни. Крайната оферта уточняваме
        лично.
      </p>

      <form
        onSubmit={handleSubmit}
        className="grid rounded-card border border-border bg-surface shadow-card lg:grid-cols-[1.9fr_1fr]"
      >
        {/* min-w-0 keeps the grid column from being widened by its content. */}
        <div className="min-w-0 p-[22px]">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-[0.72rem] font-extrabold tracking-[0.14em] text-muted uppercase">
                Да го направим ваше
              </span>
              <h2 className="mt-1 font-serif text-[1.5rem]">
                {step === 1
                  ? "Създайте своята украса"
                  : "Как да се свържем с вас?"}
              </h2>
            </div>
            <span className="rounded-full border border-border bg-bg px-3 py-1 text-xs font-bold whitespace-nowrap text-muted">
              Стъпка {step} от 2
            </span>
          </div>

          {step === 1 ? (
            <>
              <div>
                {families.map((family) => (
                  <FamilySection
                    key={family.id}
                    title={family.name}
                    description={family.description ?? ""}
                    addLabel={family.add_label ?? "Добави"}
                    tiles={tilesFor(family)}
                    onAdd={() => openAdd(family.id)}
                    onEdit={openEdit}
                    onRemove={removeItem}
                  />
                ))}
              </div>

              <EventDetails
                fields={event}
                onChange={(patch) =>
                  setEvent((current) => ({ ...current, ...patch }))
                }
                checking={checking}
              />
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mb-4 cursor-pointer text-sm font-extrabold text-rose-ink"
              >
                ← Към детайлите
              </button>

              <p className="mb-4 rounded-item bg-rail px-3.5 py-2.5 text-sm text-muted">
                Дата: {formatDate(event.date)}
                {event.time ? ` в ${event.time} ч.` : ""} · {event.city}
              </p>

              <ContactForm
                fields={contact}
                onChange={(patch) =>
                  setContact((current) => ({ ...current, ...patch }))
                }
              />
            </>
          )}
        </div>

        <div className="min-w-0 rounded-b-card border-t border-border bg-rail p-[22px] lg:rounded-tr-card lg:rounded-b-none lg:border-t-0 lg:border-l">
          <SummaryRail
            lines={summaryLines}
            total={total}
            hasQuoteItems={hasQuoteItems}
            ctaLabel={railCtaLabel}
            ctaDisabled={ctaDisabled}
            hint={step === 1 ? stepOneHint : null}
            error={error}
          />
        </div>

        {items.length > 0 && (
          <MobileSummaryBar
            itemCount={items.length}
            total={total}
            ctaLabel={barCtaLabel}
            ctaDisabled={ctaDisabled}
            hint={step === 1 ? stepOneHint : null}
          />
        )}
      </form>

      {draft && (
        <ConfiguratorModal
          draft={draft}
          setDraft={setDraft}
          productById={productById}
          groupById={groupById}
          freeInfo={{ soldOut }}
          priceOf={priceOf}
          onConfirm={confirmDraft}
        />
      )}
    </div>
  );
}

// The modal's derived data is bulky enough to split out, but it stays inside the
// same module because it leans on the parent's availability helpers. It renders
// the shared OptionModal, computing every option list from the category's data.
function ConfiguratorModal({
  draft,
  setDraft,
  productById,
  groupById,
  freeInfo,
  priceOf,
  onConfirm,
}: {
  draft: Draft;
  setDraft: (draft: Draft | null) => void;
  productById: (id: string | null) => Product | undefined;
  groupById: (id: string | null) => CatalogGroup | undefined;
  freeInfo: { soldOut: (product: Product, excludeUid: string | null) => boolean };
  priceOf: (product: Product | undefined) => number | null;
  onConfirm: () => void;
}) {
  const category = groupById(draft.categoryId);
  if (!category) return null;

  const editing = draft.editUid != null;
  const { soldOut } = freeInfo;

  const optionGroups = optionGroupsOf(category);
  const hasGroups = optionGroups.length > 0;

  const stepProducts = hasGroups
    ? category.products.filter((p) => p.option_group === draft.optionGroup)
    : category.products;

  const priceText = (product: Product, lower: boolean) => {
    const price = priceOf(product);
    if (price === null) return lower ? "по запитване" : "По запитване";
    return formatPrice(price);
  };

  const optionGroupOptions: DropdownOption[] = optionGroups.map((group) => ({
    value: group,
    label: group,
  }));

  const productDropdownOptions: DropdownOption[] = stepProducts.map((product) => {
    const out = soldOut(product, draft.editUid);
    return {
      value: product.id,
      label: `${product.name} · ${priceText(product, true)}${
        out ? " · няма свободни" : ""
      }`,
      disabled: out,
    };
  });

  const gridChoices: GridChoice[] = stepProducts.map((product) => ({
    id: product.id,
    name: product.name,
    priceLabel: priceText(product, false),
    photo: resolvePreviewImage(product),
    disabled: soldOut(product, draft.editUid),
  }));

  let recommend: RecommendView | null = null;
  const target = groupById(category.recommend_category_id);
  if (target) {
    const multi = target.products.length > 1;
    const options: DropdownOption[] = [];
    for (const product of target.products) {
      const out = soldOut(product, draft.editUid);
      const price = priceOf(product);
      const priceSuffix =
        price === null ? ` · ${QUOTE_LABEL}` : ` · +${formatPrice(price)}`;
      const outSuffix = out ? " · няма свободни" : "";
      if (product.colors.length > 0) {
        for (const color of product.colors) {
          options.push({
            value: `${product.id}::${color.id}`,
            label: `${
              multi ? `${product.name} · ${color.color_name}` : color.color_name
            }${priceSuffix}${outSuffix}`,
            disabled: out,
          });
        }
      } else {
        options.push({
          value: product.id,
          label: `${product.name}${priceSuffix}${outSuffix}`,
          disabled: out,
        });
      }
    }
    recommend = {
      title: category.recommend_title ?? "",
      hint: category.recommend_hint ?? "",
      label: category.recommend_label ?? "Добавка",
      options,
    };
  }

  const selectedProduct = draft.productId
    ? productById(draft.productId)
    : undefined;
  const { addonProductId, addonColorId } = parseAddon(draft.addonValue);
  const addonProduct = addonProductId ? productById(addonProductId) : undefined;

  const previewPhoto = resolvePreviewImage(
    selectedProduct,
    addonProduct,
    addonColorId,
  );
  // A chosen add-on colour recolours the whole item, so its single photo wins
  // over the product's carousel.
  const previewCarousel =
    selectedProduct && !addonColorId
      ? carouselImages(selectedProduct, "configurator")
      : [];

  const draftPrice = (() => {
    if (!selectedProduct) return null;
    const main = priceOf(selectedProduct);
    if (main === null) return null;
    if (!addonProduct) return main;
    const addon = priceOf(addonProduct);
    return addon === null ? null : main + addon;
  })();

  const priceLabel = !selectedProduct
    ? "-"
    : draftPrice === null
      ? "По запитване"
      : formatPrice(draftPrice);

  const productPlaceholder =
    hasGroups && !draft.optionGroup ? "първо изберете вид" : "- изберете -";

  return (
    <OptionModal
      title={`${editing ? "Промени " : "Добави "}${category.name.toLowerCase()}`}
      confirmLabel={editing ? "Запази промените" : "Потвърди избора"}
      picker={category.picker}
      optionGroupLabel="Вид"
      // A 'text' modal has no product picker, so it must not offer the "Вид"
      // dropdown either — changing it clears productId with no way to set it back.
      optionGroupOptions={category.picker === "text" ? [] : optionGroupOptions}
      optionGroup={draft.optionGroup}
      onOptionGroup={(value) =>
        setDraft({ ...draft, optionGroup: value, productId: "" })
      }
      productStepLabel={category.picker === "grid" ? "Изберете" : "Изберете вариант"}
      productPlaceholder={productPlaceholder}
      productDropdownOptions={productDropdownOptions}
      gridChoices={gridChoices}
      productDisabled={hasGroups && !draft.optionGroup}
      productId={draft.productId}
      onProduct={(value) => setDraft({ ...draft, productId: value })}
      customText={draft.customText}
      onCustomText={(value) => setDraft({ ...draft, customText: value })}
      recommend={recommend}
      addonValue={draft.addonValue}
      onAddon={(value) => setDraft({ ...draft, addonValue: value })}
      previewPhoto={previewPhoto}
      previewCarousel={previewCarousel}
      previewAlt={selectedProduct?.name ?? category.name}
      priceLabel={priceLabel}
      canConfirm={
        Boolean(selectedProduct) &&
        (category.picker !== "text" || draft.customText.trim().length > 0)
      }
      onConfirm={onConfirm}
      onClose={() => setDraft(null)}
    />
  );
}
