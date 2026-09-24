"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { selection, useSelection } from "@/lib/selection";
import type { PlpProduct } from "@/lib/catalog-plp";

// One catalog card. Five states (brief): standard, hover, added, "заето на тази
// дата", and "по запитване". Hover is pure CSS; the rest come from the data and
// the shared selection. `priority` marks the first row so their photos (the LCP)
// load eagerly.
export default function ProductCard({
  product,
  priority = false,
}: {
  product: PlpProduct;
  priority?: boolean;
}) {
  const picked = useSelection();
  const added = picked.includes(product.slug);
  const booked = product.isBooked;
  const quote = product.price === null;
  const href = `/products/${product.slug}`;

  const cardBorder = booked
    ? "border-border"
    : added
      ? "border-cta"
      : "border-border hover:border-balloon-pink";

  const buttonLabel = booked
    ? "Заето"
    : added
      ? "✓ Добавено"
      : quote
        ? "Запитване"
        : "Добави";

  const buttonAria = booked
    ? `„${product.name}“ е заето на тази дата`
    : added
      ? `Премахни „${product.name}“ от офертата`
      : `Добави „${product.name}“ към офертата`;

  const buttonStyle = booked
    ? "border-border bg-surface-2 text-muted cursor-not-allowed"
    : added
      ? "border-cta bg-cta text-white"
      : "border-balloon-pink bg-surface text-cta hover:border-cta hover:bg-cta hover:text-white";

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-card border bg-surface transition-[border-color,box-shadow] duration-150 hover:shadow-[0_10px_24px_rgb(201_58_114/0.14)] ${cardBorder} ${
        booked ? "opacity-70" : ""
      }`}
    >
      <Link
        href={href}
        aria-label={product.name}
        className="relative flex aspect-[4/3] items-center justify-center focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-cta"
        style={{ background: product.tint }}
      >
        {product.imagePath ? (
          <Image
            src={imageUrl(product.imagePath)}
            alt={product.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 45vw, 300px"
            className="object-cover"
          />
        ) : (
          <span className="text-[0.7rem] font-bold tracking-[0.1em] text-ink/55 uppercase">
            Снимка предстои
          </span>
        )}
        {booked && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-ink px-2.5 py-1 text-[0.7rem] font-bold text-white">
            Заето на тази дата
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <Link
          href={href}
          className="text-[0.95rem] leading-snug font-bold text-ink hover:underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
        >
          {product.name}
        </Link>
        {product.spec && (
          <p className="text-[0.78rem] leading-snug text-muted">{product.spec}</p>
        )}

        <div className="mt-auto flex items-center gap-2.5 pt-3">
          <span
            className={
              quote
                ? "text-[0.85rem] text-muted"
                : "text-[1.05rem] font-bold tabular-nums text-ink"
            }
          >
            {quote ? "По запитване" : formatPrice(product.price as number)}
          </span>

          <button
            type="button"
            disabled={booked}
            aria-label={buttonAria}
            aria-pressed={added}
            onClick={() => selection.toggle(product.slug)}
            className={`ml-auto inline-flex h-11 w-11 items-center justify-center rounded-full border text-lg leading-none font-extrabold transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta sm:h-auto sm:w-auto sm:px-4 sm:py-2.5 sm:text-[0.82rem] ${buttonStyle}`}
          >
            {/* Icon on narrow phones, full label from sm up. */}
            <span aria-hidden className="sm:hidden">
              {added ? "✓" : "+"}
            </span>
            <span className="hidden sm:inline">{buttonLabel}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
