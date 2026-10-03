"use client";

import { useBasket } from "@/lib/selection";
import { basketView, type PlpProduct } from "@/lib/catalog-plp";

// "Вашата оферта" pill with the live count of picked pieces. Opens the
// mini-basket drawer. Counts through basketView(), like the drawer, so a stored
// product that's no longer in the catalog isn't counted here either.
export default function OfferButton({
  onClick,
  products,
}: {
  onClick: () => void;
  products: PlpProduct[];
}) {
  const lines = useBasket();
  const count = basketView(lines, products).items.reduce(
    (sum, item) => sum + item.qty,
    0,
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2.5 rounded-full bg-cta px-5 py-3 text-sm font-extrabold whitespace-nowrap text-white transition-colors hover:bg-cta-strong focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
    >
      Вашата оферта
      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-[0.8rem] text-cta-strong tabular-nums">
        {count}
      </span>
    </button>
  );
}
