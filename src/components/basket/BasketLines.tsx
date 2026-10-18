"use client";

import Image from "next/image";
import { formatPrice } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { REQUIREMENTS_MAX, selection } from "@/lib/selection";
import { coverLabel, type BasketItem } from "@/lib/catalog-plp";
import { PATTERN_FILL } from "@/components/Swatches";

const STEP_BUTTON =
  "grid h-8 w-8 place-items-center rounded-full border border-border-strong bg-surface text-base leading-none font-extrabold text-ink transition-colors hover:border-cta hover:text-cta disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-strong disabled:hover:text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta";

// The basket's lines, shared by the mini-basket drawer and the /request page.
// Each line edits the store directly: −/+ change the quantity, „Премахни“ drops
// it. A product with colours shows the chosen colour, and the same product in
// another colour is its own line. `notes` carries an optional warning per line
// key (e.g. too few free for the date). A product with „Прозорец за
// изисквания“ shows what the customer wrote in a box they can still edit.
export default function BasketLines({
  items,
  notes = {},
}: {
  items: BasketItem[];
  notes?: Record<string, string>;
}) {
  return (
    <ul className="divide-y divide-border">
      {items.map(({ key, product, color, swatch, qty, maxQty, lineTotal, requirements }) => {
        // The colour's own photo when it has one, else the product's.
        const photo = swatch?.images[0]?.path ?? product.imagePath;
        // The colour, for the labels: "„Калъф за арка“ … — Червен".
        const colorSuffix = swatch ? ` — ${swatch.name}` : "";
        return (
          <li key={key} className="flex gap-3 py-3.5">
            <div
              className="relative h-[75px] w-[60px] shrink-0 overflow-hidden rounded-[10px]"
              style={{ background: product.tint }}
            >
              {photo && (
                <Image
                  src={imageUrl(photo)}
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
              {swatch && (
                <p className="flex items-center gap-1.5 text-[0.78rem] text-ink">
                  <span
                    aria-hidden
                    className="h-3.5 w-3.5 shrink-0 rounded-full shadow-[0_0_0_1px_var(--color-border-strong)]"
                    style={{ background: swatch.hex ?? PATTERN_FILL }}
                  />
                  {swatch.name}
                </p>
              )}
              <p className="text-[0.78rem] text-muted">
                {product.price === null
                  ? product.categoryName
                  : `${formatPrice(product.price)} / бр.`}
              </p>
              {coverLabel(product) && (
                <p className="text-[0.78rem] font-bold text-ink">
                  {coverLabel(product)}
                </p>
              )}

              <div className="mt-auto flex items-center gap-2 pt-1">
                <button
                  type="button"
                  aria-label={`Намали броя на „${product.name}“${colorSuffix}`}
                  disabled={qty <= 1}
                  onClick={() => selection.setQty(product.slug, color, qty - 1)}
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
                  aria-label={`Увеличи броя на „${product.name}“${colorSuffix}`}
                  disabled={qty >= maxQty}
                  onClick={() => selection.setQty(product.slug, color, qty + 1)}
                  className={STEP_BUTTON}
                >
                  +
                </button>
                <button
                  type="button"
                  aria-label={`Премахни „${product.name}“ от офертата${colorSuffix}`}
                  onClick={() => selection.remove(product.slug, color)}
                  className="ml-auto rounded-full px-2 py-1 text-[0.8rem] font-extrabold text-cta hover:text-cta-strong focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
                >
                  Премахни
                </button>
              </div>

              {(product.asksRequirements || requirements) && (
                <label className="block pt-1.5">
                  <span className="text-[0.72rem] font-extrabold tracking-[0.06em] text-muted uppercase">
                    Вашите изисквания
                  </span>
                  <textarea
                    rows={2}
                    maxLength={REQUIREMENTS_MAX}
                    placeholder="Опишете вашите изисквания"
                    value={requirements}
                    onChange={(event) =>
                      selection.setRequirements(product.slug, color, event.target.value)
                    }
                    className="mt-1 w-full rounded-[10px] border border-border-strong bg-surface px-2.5 py-2 text-base text-ink sm:text-[0.85rem] focus:outline-2 focus:outline-offset-2 focus:outline-rose-ink"
                  />
                </label>
              )}

              {notes[key] && (
                <p className="text-[0.78rem] font-bold text-rose-ink">
                  {notes[key]}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
