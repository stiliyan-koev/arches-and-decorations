import type { ReactNode } from "react";

// The shell for one row in the configurator: a checkbox, a price tag, and a
// body that only shows once the item is ticked.
type Props = {
  id: string;
  label: string;
  priceLabel: string;
  isQuote?: boolean;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  children?: ReactNode;
};

export default function ItemCard({
  id,
  label,
  priceLabel,
  isQuote = false,
  checked,
  onToggle,
  children,
}: Props) {
  return (
    <div
      className={`mb-3 rounded-item border p-4 transition-colors last:mb-0 ${
        checked ? "border-cta bg-cta/4" : "border-border"
      }`}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(event) => onToggle(event.target.checked)}
          className="relative h-[22px] w-[22px] flex-none cursor-pointer appearance-none rounded-[7px] border-2 border-border-strong checked:border-cta checked:bg-cta checked:after:absolute checked:after:left-[6px] checked:after:top-[2px] checked:after:h-[11px] checked:after:w-[6px] checked:after:rotate-[42deg] checked:after:border-b-[2.5px] checked:after:border-r-[2.5px] checked:after:border-white checked:after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/50"
        />
        <label htmlFor={id} className="flex-1 cursor-pointer font-extrabold">
          {label}
        </label>
        <span
          className={`whitespace-nowrap tabular-nums ${
            isQuote ? "text-sm font-bold text-muted" : "font-extrabold text-ink"
          }`}
        >
          {priceLabel}
        </span>
      </div>

      {checked && children && <div className="mt-3 pl-[34px]">{children}</div>}
    </div>
  );
}
