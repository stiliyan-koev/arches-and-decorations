"use client";

import {
  BANDS,
  bandCount,
  categoryCount,
  type FilterState,
  type PlpData,
} from "@/lib/catalog-plp";

type Props = {
  data: PlpData;
  state: FilterState;
  onMode: (mode: "service" | "rent") => void;
  onToggleCat: (slug: string) => void;
  onToggleColor: (slug: string) => void;
  onToggleBand: (id: string) => void;
};

const LEGEND = "text-[0.72rem] font-bold tracking-[0.08em] text-muted uppercase";
const RULE = "h-px bg-border";

// The filter controls, with no state of their own — the parent owns FilterState
// and passes it down. Rendered both in the desktop sidebar and inside the mobile
// bottom sheet, so it stays purely presentational.
export default function Filters({
  data,
  state,
  onMode,
  onToggleCat,
  onToggleColor,
  onToggleBand,
}: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* Как го наемате — service vs rent */}
      <fieldset className="flex flex-col gap-2.5">
        <legend className={LEGEND}>Как го наемате</legend>
        <div
          role="group"
          className="flex gap-1.5 rounded-full bg-surface-2 p-1"
        >
          {(
            [
              ["service", "Украса с монтаж"],
              ["rent", "Само под наем"],
            ] as const
          ).map(([value, label]) => {
            const active = state.mode === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => onMode(value)}
                className={`min-h-[44px] flex-1 rounded-full px-2.5 text-[0.78rem] font-extrabold transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta ${
                  active ? "bg-cta text-white" : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className={RULE} />

      {/* Категория — checkboxes with live counts */}
      <fieldset className="flex flex-col gap-1">
        <legend className={`${LEGEND} mb-1.5`}>Категория</legend>
        {data.categories.map((category) => (
          <label
            key={category.slug}
            className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[0.9rem]"
          >
            <input
              type="checkbox"
              checked={state.cats.includes(category.slug)}
              onChange={() => onToggleCat(category.slug)}
              className="h-[18px] w-[18px] accent-[var(--color-cta)]"
            />
            <span className="flex-1">{category.name}</span>
            <span className="text-xs text-muted tabular-nums">
              {categoryCount(data.products, state, category.slug)}
            </span>
          </label>
        ))}
      </fieldset>

      {data.colors.length > 0 && (
        <>
          <div className={RULE} />
          {/* Цвят и десен — swatches */}
          <fieldset className="flex flex-col gap-2.5">
            <legend className={LEGEND}>Цвят и десен</legend>
            <div className="flex flex-wrap gap-2.5">
              {data.colors.map((color) => {
                const active = state.colors.includes(color.slug);
                return (
                  <button
                    key={color.slug}
                    type="button"
                    aria-label={color.name}
                    aria-pressed={active}
                    title={color.name}
                    onClick={() => onToggleColor(color.slug)}
                    style={{
                      background:
                        color.hex ??
                        "repeating-linear-gradient(45deg,#c9c0d0 0 6px,#fff 6px 12px)",
                    }}
                    className={`h-11 w-11 rounded-full border border-border-strong transition-shadow focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta sm:h-9 sm:w-9 ${
                      active
                        ? "shadow-[0_0_0_3px_#fff,0_0_0_5px_var(--color-cta)]"
                        : ""
                    }`}
                  />
                );
              })}
            </div>
            <p className="text-xs text-muted">
              Отнася се за калъфите и балоните.
            </p>
          </fieldset>
        </>
      )}

      <div className={RULE} />

      {/* Цена — bands */}
      <fieldset className="flex flex-col gap-1">
        <legend className={`${LEGEND} mb-1.5`}>Цена</legend>
        {BANDS.map((band) => (
          <label
            key={band.id}
            className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[0.9rem]"
          >
            <input
              type="checkbox"
              checked={state.bands.includes(band.id)}
              onChange={() => onToggleBand(band.id)}
              className="h-[18px] w-[18px] accent-[var(--color-cta)]"
            />
            <span className="flex-1">{band.label}</span>
            <span className="text-xs text-muted tabular-nums">
              {bandCount(data.products, state, band)}
            </span>
          </label>
        ))}
      </fieldset>

      {/* Наличност (date + "Скрий заетите") is intentionally omitted. Per
          PLP-BRIEF.md, a date filter must reflect real availability
          (product.quantity − confirmed bookings covering the date) or be hidden.
          getReservedQuantities() exists but is unverified against live Postgres
          and fails open (returns {} = everything free) — exactly the misleading
          filter the brief warns against. TODO: add the date input and "Скрий
          заетите" once per-date availability is wired and verified. */}
    </div>
  );
}
