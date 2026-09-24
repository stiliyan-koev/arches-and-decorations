"use client";

import { useEffect, useRef } from "react";
import Filters from "@/components/catalog/Filters";
import type { FilterState, PlpData } from "@/lib/catalog-plp";

type Props = {
  open: boolean;
  onClose: () => void;
  data: PlpData;
  state: FilterState;
  resultCount: number;
  onMode: (mode: "service" | "rent") => void;
  onToggleCat: (slug: string) => void;
  onToggleColor: (slug: string) => void;
  onToggleBand: (id: string) => void;
  onClear: () => void;
};

// The mobile filter sheet (brief: filters live in a bottom sheet, not a sidebar).
// It reuses <Filters> for the controls and adds the header, the "Изчисти" reset
// and the "Покажи N" apply button. Changes apply live; "Покажи N" just closes.
export default function FilterSheet({
  open,
  onClose,
  data,
  state,
  resultCount,
  onMode,
  onToggleCat,
  onToggleColor,
  onToggleBand,
  onClear,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape to close, and lock the page behind the sheet while it's open.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Филтри">
      <button
        type="button"
        aria-label="Затвори филтрите"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />

      <div className="animate-sheet-up absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-[26px] bg-bg shadow-[0_-20px_50px_rgb(59_47_66/0.18)]">
        <div className="flex items-center gap-3 border-b border-border px-5 pt-3 pb-3.5">
          <span
            aria-hidden
            className="absolute inset-x-0 top-2 mx-auto h-1 w-10 rounded-full bg-border-strong"
          />
          <h2 className="flex-1 font-display text-lg font-semibold">Филтри</h2>
          <button
            type="button"
            onClick={onClear}
            className="rounded-full px-2 py-1.5 text-[0.82rem] font-extrabold text-cta focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
          >
            Изчисти
          </button>
          <button
            ref={closeRef}
            type="button"
            aria-label="Затвори"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <Filters
            data={data}
            state={state}
            onMode={onMode}
            onToggleCat={onToggleCat}
            onToggleColor={onToggleColor}
            onToggleBand={onToggleBand}
          />
        </div>

        <div className="border-t border-border bg-surface px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[50px] w-full items-center justify-center rounded-full bg-cta px-5 text-[0.95rem] font-extrabold text-white hover:bg-cta-strong focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
          >
            Покажи {resultCount}{" "}
            {resultCount === 1 ? "продукт" : "продукта"}
          </button>
        </div>
      </div>
    </div>
  );
}
