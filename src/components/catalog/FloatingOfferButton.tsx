"use client";

import { useBasket } from "@/lib/selection";
import { basketView, type PlpProduct } from "@/lib/catalog-plp";

// Round basket button pinned to the bottom-right corner. It stands in for the
// „Вашата оферта“ pill once that has scrolled out of view, so the basket is
// always one tap away. Only shows when something is picked. Counts like
// OfferButton, through basketView().
export default function FloatingOfferButton({
  onClick,
  products,
  pillInView,
}: {
  onClick: () => void;
  products: PlpProduct[];
  pillInView: boolean;
}) {
  const lines = useBasket();
  const count = basketView(lines, products).items.reduce(
    (sum, item) => sum + item.qty,
    0,
  );
  const shown = count > 0 && !pillInView;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Вашата оферта: ${count} бр.`}
      className={`fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 grid h-14 w-14 place-items-center rounded-full bg-cta text-white shadow-[0_8px_24px_rgb(59_47_66/0.3)] transition-[background-color,opacity,translate,visibility] duration-200 hover:bg-cta-strong focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta motion-reduce:transition-none sm:right-6 sm:bottom-6 ${
        shown ? "" : "invisible translate-y-4 opacity-0"
      }`}
    >
      <svg
        width={26}
        height={26}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M2 11h20" />
        <path d="M5 11l4-7" />
        <path d="M19 11l-4-7" />
        <path d="M3.5 11l1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.6-7.4" />
        <path d="M9 11l1 9" />
        <path d="M15 11l-1 9" />
        <path d="M4.5 15.5h15" />
      </svg>
      <span
        aria-hidden
        className="absolute -top-1 -right-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-cta bg-white px-1 text-[0.78rem] font-extrabold text-cta-strong tabular-nums"
      >
        {count}
      </span>
    </button>
  );
}
