"use client";

import type { Ref } from "react";
import { useBasketCount } from "@/lib/selection";

// "Вашата оферта" pill with the live count of picked pieces. Opens the
// mini-basket drawer. `ref` lets the drawer hand focus back here on close.
export default function OfferButton({
  onClick,
  ref,
}: {
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  const count = useBasketCount();

  return (
    <button
      ref={ref}
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
