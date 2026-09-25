"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import OptionDropdown, {
  type DropdownOption,
} from "@/components/configurator/OptionDropdown";
import PhotoGridPicker, {
  type GridChoice,
} from "@/components/configurator/PhotoGridPicker";
import RecommendBlock from "@/components/configurator/RecommendBlock";
import PreviewPane from "@/components/configurator/PreviewPane";
import type { Picker, ProductImage } from "@/lib/types";

export type RecommendView = {
  title: string;
  hint: string;
  label: string;
  options: DropdownOption[];
};

type Props = {
  title: string;
  confirmLabel: string;
  picker: Picker;

  // First step — the option group. An empty options array skips it entirely.
  optionGroupLabel: string;
  optionGroupOptions: DropdownOption[];
  optionGroup: string;
  onOptionGroup: (value: string) => void;

  // Second step — the product, as a dropdown or a photo grid. A 'text' picker
  // shows the text box below instead.
  productStepLabel: string;
  productPlaceholder: string;
  productDropdownOptions: DropdownOption[];
  gridChoices: GridChoice[];
  productDisabled: boolean;
  productId: string;
  onProduct: (value: string) => void;

  // The customer's own description, for a 'text' picker. Optional.
  customText: string;
  onCustomText: (value: string) => void;

  // Optional add-on.
  recommend: RecommendView | null;
  addonValue: string;
  onAddon: (value: string) => void;

  // Preview + footer.
  previewPhoto: ProductImage | null;
  previewAlt: string;
  priceLabel: string;
  canConfirm: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

// One modal for every family. What it shows is entirely decided by the props
// the Configurator computes from the category's data — there is no per-category
// branching here beyond the picker (dropdown, grid or text box).
export default function OptionModal({
  title,
  confirmLabel,
  picker,
  optionGroupLabel,
  optionGroupOptions,
  optionGroup,
  onOptionGroup,
  productStepLabel,
  productPlaceholder,
  productDropdownOptions,
  gridChoices,
  productDisabled,
  productId,
  onProduct,
  customText,
  onCustomText,
  recommend,
  addonValue,
  onAddon,
  previewPhoto,
  previewAlt,
  priceLabel,
  canConfirm,
  onConfirm,
  onClose,
}: Props) {
  const hasOptionGroup = optionGroupOptions.length > 0;

  // Lock the page behind the modal so scrolling stays inside it (no chaining to
  // the body, and the sticky header can't peek through).
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/45 p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-[min(880px,100%)] overflow-auto overscroll-contain rounded-card bg-surface shadow-[0_24px_60px_rgb(62_47_53/0.3)]"
      >
        <div className="flex items-center gap-3 px-[22px] pt-5">
          <h3 className="font-serif text-[1.45rem]">{title}</h3>
          <button
            type="button"
            aria-label="Затвори"
            onClick={onClose}
            className="ml-auto grid h-[34px] w-[34px] place-items-center rounded-full border border-border-strong bg-surface text-[1.05rem] text-muted hover:border-rose hover:text-rose-ink"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-[22px] px-[22px] pt-[18px] pb-[22px] sm:grid-cols-2">
          <PreviewPane photo={previewPhoto} alt={previewAlt} />

          <div className="flex flex-col gap-3.5">
            {hasOptionGroup && (
              <OptionDropdown
                label={optionGroupLabel}
                value={optionGroup}
                placeholder="- изберете -"
                options={optionGroupOptions}
                onChange={onOptionGroup}
              />
            )}

            {picker === "text" ? (
              <div>
                <label
                  htmlFor="custom-text"
                  className="mb-1.5 block text-[0.72rem] font-extrabold tracking-[0.06em] text-muted uppercase"
                >
                  Опишете темата
                </label>
                <textarea
                  id="custom-text"
                  rows={4}
                  maxLength={1000}
                  placeholder="Напр. рожден ден на 5-годишно момиче, тема „Замръзналото кралство“, в синьо и бяло."
                  value={customText}
                  onChange={(event) => onCustomText(event.target.value)}
                  className="w-full rounded-[10px] border border-border-strong bg-surface px-[11px] py-2.5 text-[0.93rem] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-rose-ink"
                />
                <p className="mt-1.5 text-[0.78rem] leading-snug text-muted">
                  Според темата ще ви предложим подходящи балони и цветове.
                </p>
              </div>
            ) : picker === "grid" ? (
              <PhotoGridPicker
                label={productStepLabel}
                choices={gridChoices}
                selectedId={productId}
                onPick={onProduct}
              />
            ) : (
              <OptionDropdown
                label={productStepLabel}
                value={productId}
                placeholder={productPlaceholder}
                options={productDropdownOptions}
                disabled={productDisabled}
                onChange={onProduct}
              />
            )}

            {recommend && (
              <RecommendBlock
                title={recommend.title}
                hint={recommend.hint}
                label={recommend.label}
                options={recommend.options}
                value={addonValue}
                onChange={onAddon}
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-[22px] pb-[22px]">
          <div className="font-extrabold">
            <span className="block text-[0.72rem] font-bold tracking-[0.08em] text-muted uppercase">
              Ориентировъчно
            </span>
            <span className="text-[1.05rem] tabular-nums">{priceLabel}</span>
          </div>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={onConfirm}
            className="ml-auto rounded-full bg-ink px-6 py-3 text-[0.95rem] font-extrabold text-white shadow-sm transition-colors hover:bg-cta-strong disabled:cursor-not-allowed disabled:bg-border-strong disabled:text-muted disabled:shadow-none"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  // Portal to <body> so the overlay escapes the configurator's z-10 stacking
  // context and paints above the sticky header.
  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
