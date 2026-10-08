import { formatTotal } from "@/lib/format";

export type SummaryLine = {
  key: string;
  name: string; // the family name
  sub: string; // chosen options
  value: string; // price or „по запитване"
};

type Props = {
  lines: SummaryLine[];
  total: number;
  hasQuoteItems: boolean;
  ctaLabel: string;
  ctaDisabled: boolean;
  hint: string | null;
  error: string | null;
};

// The blush rail. Same two views as the reference: an empty prompt, then a line
// list with the running approximate total and the CTA.
export default function SummaryRail({
  lines,
  total,
  hasQuoteItems,
  ctaLabel,
  ctaDisabled,
  hint,
  error,
}: Props) {
  const empty = lines.length === 0;

  return (
    <div className="lg:sticky lg:top-[88px]">
      <div className="text-[0.72rem] font-extrabold tracking-[0.14em] text-muted uppercase">
        Вашият празник
      </div>
      <h3 className="mt-1.5 mb-2.5 font-serif text-[1.35rem] font-medium">
        Малко по малко,
        <br />
        става вълшебно.
      </h3>

      {empty ? (
        <p className="mb-3.5 text-[0.88rem] text-muted">
          Все още нямате избрани детайли.
        </p>
      ) : (
        <ul className="mb-3.5 text-[0.88rem]">
          {lines.map((line) => (
            <li
              key={line.key}
              className="flex justify-between gap-2.5 border-b border-ink/10 py-2 last:border-b-0"
            >
              <span>
                {line.name}
                {line.sub && (
                  <small className="block text-[0.78rem] font-normal text-muted">
                    {line.sub}
                  </small>
                )}
              </span>
              <span className="font-bold whitespace-nowrap tabular-nums">
                {line.value}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="text-[0.68rem] font-extrabold tracking-[0.12em] text-muted uppercase">
        Ориентировъчна сума
      </div>
      <div
        className="my-0.5 mb-1.5 font-serif text-[2.3rem] leading-none font-semibold tabular-nums"
        aria-live="polite"
      >
        {formatTotal(total, hasQuoteItems)}
      </div>
      <p className="mb-3.5 text-[0.78rem] leading-relaxed text-muted">
        Цената е ориентировъчна. Крайната оферта уточняваме лично.
        {hasQuoteItems && !empty && (
          <> Артикулите „по запитване“ остойностяваме отделно.</>
        )}
      </p>

      {error && (
        <p className="mb-3.5 rounded-[10px] border border-rose/40 bg-rose/5 px-3 py-2.5 text-sm font-bold text-rose-ink">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={ctaDisabled}
        className={`w-full rounded-full px-4 py-3.5 text-[0.98rem] font-extrabold transition-colors ${
          ctaDisabled
            ? "cursor-not-allowed bg-border-strong text-muted"
            : "cursor-pointer bg-ink text-white hover:bg-cta-strong"
        }`}
      >
        {ctaLabel}
      </button>

      {hint && (
        <p className="mt-2.5 text-center text-xs font-bold text-muted">{hint}</p>
      )}

      <p className="mt-3 text-center text-[0.75rem] leading-relaxed text-muted">
        Запитването не е резервация.
        <br />
        Потвърждаваме лично всеки празник.
      </p>
    </div>
  );
}
