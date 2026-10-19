import { formatPrice } from "@/lib/format";

// „Труд за украса“ under the basket's lines. Not a product, so no photo,
// quantity or „Премахни“: a label, added once to a basket she sets up (see
// hasLabour in catalog-plp.ts) and gone again in „Само под наем“.
export default function LabourLabel({ price }: { price: number }) {
  return (
    <div className="my-3 flex items-center gap-3 rounded-item border border-dashed border-balloon-pink bg-surface-2 px-3.5 py-3">
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cta px-3 py-1 text-[0.78rem] font-extrabold text-white">
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />
        </svg>
        Труд за украса
      </span>
      <span className="min-w-0 flex-1 text-[0.75rem] leading-snug text-muted">
        Веднъж за цялата украса
      </span>
      <span className="text-[0.9rem] font-bold whitespace-nowrap tabular-nums">
        {formatPrice(price)}
      </span>
    </div>
  );
}
