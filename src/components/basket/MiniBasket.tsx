"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import BasketLines from "@/components/basket/BasketLines";
import { formatTotal } from "@/lib/format";
import { MAX_LINES, useBasket } from "@/lib/selection";
import { basketView, type PlpProduct } from "@/lib/catalog-plp";

type Props = {
  open: boolean;
  onClose: () => void;
  products: PlpProduct[];
  lastAdded: string | null; // slug of the product just added, for the confirmation line
  full: boolean; // an add was refused because the basket already holds MAX_LINES products
};

// The mini-basket: a drawer from the right edge (full width on phones). It opens
// on every „Добави“ and from the „Вашата оферта“ pill, lists what's picked with
// the running approximate total, and hands over to /request.
export default function MiniBasket({
  open,
  onClose,
  products,
  lastAdded,
  full,
}: Props) {
  const lines = useBasket();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { items, total, hasQuote } = basketView(lines, products);
  const added = lastAdded
    ? items.find((item) => item.product.slug === lastAdded)
    : undefined;

  // Escape to close, and lock the page behind the drawer while it's open.
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

  const pieces = items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Вашата оферта"
    >
      <button
        type="button"
        aria-label="Затвори офертата"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />

      <div className="animate-drawer-in absolute inset-y-0 right-0 flex w-full flex-col bg-bg shadow-[-20px_0_50px_rgb(59_47_66/0.18)] sm:w-[420px]">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="flex-1 font-display text-lg font-semibold">
            Вашата оферта
            {pieces > 0 && (
              <span className="ml-2 text-sm font-normal text-muted tabular-nums">
                ({pieces} бр.)
              </span>
            )}
          </h2>
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

        {added && (
          <p
            className="flex items-center gap-2 border-b border-border bg-surface-2 px-5 py-2.5 text-[0.85rem] font-bold text-ink"
            role="status"
          >
            <span aria-hidden className="text-cta">
              ✓
            </span>
            Добавено: „{added.product.name}“
          </p>
        )}

        {full && (
          <p
            className="border-b border-border bg-surface-2 px-5 py-2.5 text-[0.85rem] font-bold text-ink"
            role="status"
          >
            Максимум {MAX_LINES} различни продукта в едно запитване.
          </p>
        )}

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-lg font-semibold">Офертата е празна</p>
            <p className="text-sm text-muted">
              Добавете от каталога каквото ви харесва — ще видите ориентировъчната
              сума тук.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 min-h-[44px] rounded-full border border-balloon-pink bg-surface px-6 text-sm font-extrabold text-cta hover:bg-surface-2 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
            >
              Към каталога
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              <BasketLines items={items} />
            </div>

            <div className="border-t border-border bg-surface px-5 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[0.72rem] font-extrabold tracking-[0.12em] text-muted uppercase">
                  Ориентировъчна сума
                </span>
                <span
                  className="font-serif text-[1.6rem] leading-none font-semibold tabular-nums"
                  aria-live="polite"
                >
                  {formatTotal(total, hasQuote)}
                </span>
              </div>
              <p className="mt-1.5 text-[0.75rem] leading-relaxed text-muted">
                Крайната оферта уточняваме лично.
                {hasQuote && <> Артикулите „по запитване“ остойностяваме отделно.</>}
              </p>

              <Link
                href="/request"
                className="mt-3.5 flex min-h-[50px] w-full items-center justify-center rounded-full bg-cta px-5 text-[0.95rem] font-extrabold text-white hover:bg-cta-strong focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
              >
                Продължи към запитването →
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 w-full rounded-full py-2 text-sm font-extrabold text-cta hover:text-cta-strong focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
              >
                Разгледай още
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
