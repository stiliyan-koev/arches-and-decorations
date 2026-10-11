import type { PlpSwatch } from "@/lib/catalog-plp";

// Pattern swatches (hex is null, e.g. "Замък на Елза") have no flat colour, so
// they share one generic pattern fill — here, in the basket and in the admin.
export const PATTERN_FILL =
  "repeating-linear-gradient(45deg, #9BD3E6 0 6px, #FFFFFF 6px 12px)";

type Props = {
  swatches: PlpSwatch[];
  selected: string | null; // the chosen colour's slug
  onSelect: (slug: string) => void;
  label: string; // names the group for screen readers, e.g. "Цвят – Калъф за арка"
};

// A product's colours as round dots, with the chosen one's name under them.
// A colour she has none of is dimmed but still clickable, so its photo can
// still be seen; the card then won't add it.
export default function Swatches({ swatches, selected, onSelect, label }: Props) {
  const current = swatches.find((swatch) => swatch.slug === selected);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 sm:gap-2" role="group" aria-label={label}>
        {swatches.map((swatch) => {
          const soldOut = swatch.stock !== null && swatch.stock <= 0;
          const active = swatch.slug === selected;
          return (
            <button
              key={swatch.slug}
              type="button"
              title={soldOut ? `${swatch.name} (няма)` : swatch.name}
              aria-label={soldOut ? `${swatch.name} – няма` : swatch.name}
              aria-pressed={active}
              onClick={() => onSelect(swatch.slug)}
              style={{ background: swatch.hex ?? PATTERN_FILL }}
              className={`h-6 w-6 cursor-pointer rounded-full border-2 border-white sm:h-7 sm:w-7 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta ${
                active
                  ? "shadow-[0_0_0_2px_var(--color-cta)]"
                  : "shadow-[0_0_0_1px_var(--color-border-strong)]"
              } ${soldOut ? "opacity-40" : ""}`}
            />
          );
        })}
      </div>
      {current && (
        <p className="mt-1.5 line-clamp-1 text-[0.78rem] text-muted">
          Цвят: <strong className="font-bold text-ink">{current.name}</strong>
          {current.stock !== null && current.stock <= 0 && " · няма"}
        </p>
      )}
    </div>
  );
}
