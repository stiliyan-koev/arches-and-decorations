"use client";

import Link from "next/link";
import { useSelectionCount } from "@/lib/selection";

// "Вашата оферта" pill with the live count of picked items. Links to the
// configurator on the homepage, where an оферта is finalised.
export default function OfferButton() {
  const count = useSelectionCount();

  return (
    <Link
      href="/#calc"
      className="inline-flex items-center gap-2.5 rounded-full bg-cta px-5 py-3 text-sm font-extrabold whitespace-nowrap text-white transition-colors hover:bg-cta-strong focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
    >
      Вашата оферта
      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-[0.8rem] text-cta-strong tabular-nums">
        {count}
      </span>
    </Link>
  );
}
