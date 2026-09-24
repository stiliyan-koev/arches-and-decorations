import { formatPrice } from "@/lib/format";

type Props = {
  itemCount: number;
  total: number;
  ctaLabel: string;
  ctaDisabled: boolean;
  hint: string | null;
};

// On desktop the summary rail sits beside the grid and is always in view. On a
// phone it drops below the grid, so the running total disappears the moment you
// start scrolling tiles — and most of her traffic comes from Instagram, on a
// phone. This pins the same number and the same next step to the bottom of the
// screen. It repeats the rail rather than replacing it: the rail still shows
// the full line list further down.
export default function MobileSummaryBar({
  itemCount,
  total,
  ctaLabel,
  ctaDisabled,
  hint,
}: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgb(59_47_66/0.12)] lg:hidden">
      <div className="mx-auto flex max-w-[1140px] items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted">
            {itemCount} {itemCount === 1 ? "детайл" : "детайла"} ·{" "}
            <strong className="text-ink tabular-nums">
              {formatPrice(total)}
            </strong>
          </p>
          {hint && (
            <p className="truncate text-[0.72rem] font-bold text-muted">
              {hint}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={ctaDisabled}
          className={`flex-none rounded-full px-5 py-3 text-sm font-extrabold whitespace-nowrap transition-colors ${
            ctaDisabled
              ? "cursor-not-allowed bg-border-strong text-muted"
              : "cursor-pointer bg-ink text-white hover:bg-cta-strong"
          }`}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
