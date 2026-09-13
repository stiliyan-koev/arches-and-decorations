import type { ProductColor } from "@/lib/types";

// Pattern swatches (hex is null, e.g. "Замък на Елза") have no flat colour.
// Until real photos are in Storage they share one generic pattern fill; step 2
// swaps this for the colour's image tile per catalog-and-images.md.
const PATTERN_FILL =
  "repeating-linear-gradient(45deg, #9BD3E6 0 6px, #FFFFFF 6px 12px)";

type Props = {
  colors: ProductColor[];
  selectedId: string | null;
  onSelect: (colorId: string) => void;
  label: string;
};

export default function Swatches({
  colors,
  selectedId,
  onSelect,
  label,
}: Props) {
  const selected = colors.find((color) => color.id === selectedId);

  return (
    <div>
      <div className="flex flex-wrap gap-2.5" role="group" aria-label={label}>
        {colors.map((color) => (
          <button
            key={color.id}
            type="button"
            title={color.color_name}
            aria-label={color.color_name}
            aria-pressed={color.id === selectedId}
            onClick={() => onSelect(color.id)}
            style={{ background: color.hex ?? PATTERN_FILL }}
            className={`h-[30px] w-[30px] cursor-pointer rounded-full border-2 border-white bg-cover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/50 ${
              color.id === selectedId
                ? "shadow-[0_0_0_2px_var(--color-cta)]"
                : "shadow-[0_0_0_1px_var(--color-border-strong)]"
            }`}
          />
        ))}
      </div>
      {selected && (
        <p className="mt-2 text-sm text-muted">
          Избран цвят: <strong className="text-ink">{selected.color_name}</strong>
        </p>
      )}
    </div>
  );
}
