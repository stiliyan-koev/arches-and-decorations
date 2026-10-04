"use client";

import Image from "next/image";
import { formatPrice } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { selection } from "@/lib/selection";
import type { BasketItem } from "@/lib/catalog-plp";

const STEP_BUTTON =
  "grid h-8 w-8 place-items-center rounded-full border border-border-strong bg-surface text-base leading-none font-extrabold text-ink transition-colors hover:border-cta hover:text-cta disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-strong disabled:hover:text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta";

// The basket's lines, shared by the mini-basket drawer and the /request page.
// Each line edits the store directly: −/+ change the quantity, „Премахни“ drops
// it. `notes` carries an optional warning per slug (e.g. too few free for the date).
export default function BasketLines({
  items,
  notes = {},
}: {
  items: BasketItem[];
  notes?: Record<string, string>;
}) {
  return (
    <ul className="divide-y divide-border">
      {items.map(({ product, qty, lineTotal }) => (
        <li key={product.slug} className="flex gap-3 py-3.5">
          <div
            className="relative h-[75px] w-[60px] shrink-0 overflow-hidden rounded-[10px]"
            style={{ background: product.tint }}
          >
            {product.imagePath && (
              <Image
                src={imageUrl(product.imagePath)}
                alt=""
                fill
                sizes="60px"
                className="object-cover"
              />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 text-[0.9rem] leading-tight font-bold text-ink">
                {product.name}
              </p>
              <span className="text-[0.9rem] font-bold whitespace-nowrap tabular-nums">
                {lineTotal === null ? "По запитване" : formatPrice(lineTotal)}
              </span>
            </div>
            <p className="text-[0.78rem] text-muted">
              {product.price === null
                ? product.categoryName
                : `${formatPrice(product.price)} / бр.`}
            </p>

            <div className="mt-auto flex items-center gap-2 pt-1">
              <button
                type="button"
                aria-label={`Намали броя на „${product.name}“`}
                disabled={qty <= 1}
                onClick={() => selection.setQty(product.slug, qty - 1)}
                className={STEP_BUTTON}
              >
                −
              </button>
              <span
                className="min-w-6 text-center text-sm font-bold tabular-nums"
                aria-live="polite"
              >
                {qty}
              </span>
              <button
                type="button"
                aria-label={`Увеличи броя на „${product.name}“`}
                disabled={qty >= product.maxQty}
                onClick={() => selection.setQty(product.slug, qty + 1)}
                className={STEP_BUTTON}
              >
                +
              </button>
              <button
                type="button"
                aria-label={`Премахни „${product.name}“ от офертата`}
                onClick={() => selection.remove(product.slug)}
                className="ml-auto rounded-full px-2 py-1 text-[0.8rem] font-extrabold text-cta hover:text-cta-strong focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
              >
                Премахни
              </button>
            </div>

            {notes[product.slug] && (
              <p className="text-[0.78rem] font-bold text-rose-ink">
                {notes[product.slug]}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
