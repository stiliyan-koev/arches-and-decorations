import Image from "next/image";
import { imageUrl } from "@/lib/images";
import type { ProductImage } from "@/lib/types";

type Props = {
  photo: ProductImage | null;
  title: string; // the family name, e.g. "Арка"
  meta: string; // chosen options, joined with " · "
  priceLabel: string;
  isQuote: boolean;
  onEdit: () => void;
  onRemove: () => void;
};

// A confirmed selection, rendered rose-bordered under its family. The green
// "add" button stays below the row so another one can be added.
export default function ItemTile({
  photo,
  title,
  meta,
  priceLabel,
  isQuote,
  onEdit,
  onRemove,
}: Props) {
  return (
    <article className="flex flex-col overflow-hidden rounded-item border border-rose bg-surface shadow-[0_0_0_3px_rgb(196_140_162/0.12)]">
      <div className="relative grid aspect-[4/5] place-items-center border-b border-border bg-bg">
        {photo ? (
          <Image
            src={imageUrl(photo.path)}
            alt={title}
            fill
            sizes="(max-width: 780px) 45vw, 240px"
            className="object-cover"
          />
        ) : (
          <span className="text-[0.72rem] text-muted">Снимка предстои</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <div className="text-[0.92rem] font-extrabold">{title}</div>
        <div className="text-[0.76rem] leading-snug text-muted">{meta}</div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
          <span
            className={`font-extrabold ${
              isQuote ? "text-[0.8rem] text-rose-ink" : "text-[0.92rem] tabular-nums"
            }`}
          >
            {priceLabel}
          </span>
          <span className="flex gap-1.5">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full border border-border-strong bg-surface px-3 py-1.5 text-[0.76rem] font-extrabold text-ink hover:border-rose hover:text-rose-ink"
            >
              Редактирай
            </button>
            <button
              type="button"
              aria-label="Премахни"
              onClick={onRemove}
              className="rounded-full border border-border-strong bg-surface px-2.5 py-1.5 text-[0.76rem] font-extrabold text-muted hover:border-rose hover:text-rose-ink"
            >
              ✕
            </button>
          </span>
        </div>
      </div>
    </article>
  );
}
