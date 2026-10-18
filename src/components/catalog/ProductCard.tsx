"use client";

import { useState } from "react";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import { fullImagePath, imageUrl } from "@/lib/images";
import PhotoViewer from "@/components/PhotoViewer";
import PhotoCarousel from "@/components/PhotoCarousel";
import Swatches from "@/components/Swatches";
import SpecLine from "@/components/catalog/SpecLine";
import RequirementsDialog from "@/components/catalog/RequirementsDialog";
import { selection, useIsSelected } from "@/lib/selection";
import { coverLabel, lineKey, type PlpProduct, type PlpSwatch } from "@/lib/catalog-plp";

const CARD_SIZES = "(max-width: 640px) 45vw, (max-width: 1024px) 45vw, 300px";

// One catalog card. Five states (brief): standard, hover, added, "заето на тази
// дата", and "по запитване". Hover is pure CSS; the rest come from the data and
// the shared basket. `priority` marks the first row so their photos (the LCP)
// load eagerly. The button adds the product and opens the mini-basket; once it's
// in, the button just reopens the mini-basket — removing happens there.
//
// A product with colours shows them as swatches. The chosen colour's photos
// replace the card's photo (a colour without photos keeps it), and „Добави“
// adds the product in that colour — another colour is another basket line.
// A product with „Прозорец за изисквания“ first asks what the customer wants
// (RequirementsDialog), and adds it with that text.
export default function ProductCard({
  product,
  priority = false,
  filterColors,
  onAdd,
}: {
  product: PlpProduct;
  priority?: boolean;
  filterColors: string[]; // the catalog's colour filter: the card starts on a matching colour
  // addedKey (a lineKey) null = nothing new went in, just reopen; full = the basket was full.
  onAdd: (addedKey: string | null, full: boolean) => void;
}) {
  // The colour the customer clicked; see chooseSwatch for the rest.
  const [picked, setPicked] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const swatch = chooseSwatch(product.swatches, picked, filterColors);
  const color = swatch?.slug ?? null;

  const added = useIsSelected(product.slug, color);
  // A colour she has none of can't be added, even when other colours can.
  const booked = product.isBooked || (swatch !== null && swatch.maxQty === 0);
  const quote = product.price === null;
  // The colour, for the labels: "„Калъф за арка“ … — Червен".
  const colorSuffix = swatch ? ` — ${swatch.name}` : "";
  const photos = swatch?.images.length ? swatch.images : null;
  // Link to /product/[slug] once the product page exists (brief route is singular).

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
    ? `„${product.name}“ е заето на тази дата${colorSuffix}`
    : added
      ? `„${product.name}“ е в офертата — отвори офертата${colorSuffix}`
      : `Добави „${product.name}“ към офертата${colorSuffix}`;

  function add(requirements: string) {
    const accepted = selection.add(product.slug, color, requirements);
    onAdd(accepted ? lineKey(product.slug, color) : null, !accepted);
  }

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
      <div
        className="relative flex aspect-[4/5] items-center justify-center focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-cta"
        style={{ background: product.tint }}
      >
        {photos ? (
          photos.length > 1 ? (
            // Keyed by colour, so a new colour starts on its first photo.
            <PhotoCarousel
              key={color}
              images={photos}
              alt={`${product.name} – ${swatch?.name}`}
              priority={priority}
              sizes={CARD_SIZES}
            />
          ) : (
            <>
              <Image
                src={imageUrl(photos[0].path)}
                alt={`${product.name} – ${swatch?.name}`}
                fill
                priority={priority}
                sizes={CARD_SIZES}
                className="object-cover"
              />
              <PhotoViewer
                src={imageUrl(fullImagePath(photos[0]))}
                alt={`${product.name} – ${swatch?.name}`}
              />
            </>
          )
        ) : product.carousel.length > 0 ? (
          <PhotoCarousel
            images={product.carousel}
            alt={product.name}
            priority={priority}
            sizes={CARD_SIZES}
          />
        ) : product.imagePath ? (
          <Image
            src={imageUrl(product.imagePath)}
            alt={product.name}
            fill
            priority={priority}
            sizes={CARD_SIZES}
            className="object-cover"
          />
        ) : (
          <span className="text-[0.7rem] font-bold tracking-[0.1em] text-ink/55 uppercase">
            Снимка предстои
          </span>
        )}
        {!photos && product.carousel.length === 0 && product.fullImagePath && (
          <PhotoViewer src={imageUrl(product.fullImagePath)} alt={product.name} />
        )}
        {product.isBooked && (
          <span className="absolute top-2.5 left-2.5 rounded-full bg-ink px-2.5 py-1 text-[0.7rem] font-bold text-white">
            Заето на тази дата
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-0.5 p-3 sm:p-4">
        <p className="line-clamp-2 text-[0.9rem] leading-tight font-bold text-ink hover:underline sm:text-[0.95rem] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta">
          {product.name}
        </p>
        {product.spec && <SpecLine spec={product.spec} title={product.name} />}
        {coverLabel(product) && (
          <p className="text-[0.78rem] leading-snug font-bold text-ink">
            {coverLabel(product)}
          </p>
        )}
        {swatch && (
          <div className="pt-2">
            <Swatches
              swatches={product.swatches}
              selected={color}
              onSelect={setPicked}
              label={`Цвят – ${product.name}`}
            />
          </div>
        )}

        <div className="mt-auto flex items-center gap-2.5 pt-2">
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
            aria-haspopup={product.asksRequirements && !added ? "dialog" : undefined}
            onClick={() => {
              if (added) return onAdd(null, false);
              if (product.asksRequirements) return setAsking(true);
              add("");
            }}
            className={`ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border text-lg leading-none font-extrabold transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta sm:h-auto sm:w-auto sm:px-4 sm:py-2.5 sm:text-[0.82rem] ${buttonStyle}`}
          >
            {/* Icon on narrow phones, full label from sm up. */}
            <span aria-hidden className="sm:hidden">
              {added ? "✓" : "+"}
            </span>
            <span className="hidden sm:inline">{buttonLabel}</span>
          </button>
        </div>
      </div>

      {asking && (
        <RequirementsDialog
          title={`${product.name}${colorSuffix}`}
          onAdd={add}
          onClose={() => setAsking(false)}
        />
      )}
    </article>
  );
}

// Which colour the card shows: the one the customer clicked, else the first one
// the catalog's colour filter asks for, else the first she has any of, else the
// first. Null when the product has no colours.
function chooseSwatch(
  swatches: PlpSwatch[],
  picked: string | null,
  filterColors: string[],
): PlpSwatch | null {
  return (
    swatches.find((swatch) => swatch.slug === picked) ??
    swatches.find((swatch) => filterColors.includes(swatch.slug)) ??
    swatches.find((swatch) => swatch.maxQty > 0) ??
    swatches[0] ??
    null
  );
}
