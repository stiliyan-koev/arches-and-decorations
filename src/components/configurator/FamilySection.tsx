import ItemTile from "@/components/configurator/ItemTile";
import type { ProductImage } from "@/lib/types";

export type TileView = {
  uid: string;
  photo: ProductImage | null;
  title: string;
  meta: string;
  priceLabel: string;
  isQuote: boolean;
};

type Props = {
  title: string;
  description: string;
  addLabel: string;
  tiles: TileView[];
  onAdd: () => void;
  onEdit: (uid: string) => void;
  onRemove: (uid: string) => void;
};

// One category on the homepage: a big serif title, a description line, whatever
// has already been chosen, and the single green "add" button.
export default function FamilySection({
  title,
  description,
  addLabel,
  tiles,
  onAdd,
  onEdit,
  onRemove,
}: Props) {
  return (
    <section className="border-t border-border py-5 first:border-t-0 first:pt-0">
      <h3 className="font-serif text-[1.35rem]">{title}</h3>
      <p className="mt-0.5 mb-3.5 max-w-[56ch] text-[0.87rem] text-muted">
        {description}
      </p>

      {tiles.length > 0 && (
        <div className="mb-3.5 grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 sm:grid-cols-3">
          {tiles.map((tile) => (
            <ItemTile
              key={tile.uid}
              photo={tile.photo}
              title={tile.title}
              meta={tile.meta}
              priceLabel={tile.priceLabel}
              isQuote={tile.isQuote}
              onEdit={() => onEdit(tile.uid)}
              onRemove={() => onRemove(tile.uid)}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2.5 rounded-full border border-green-edge bg-green px-[22px] py-2.5 text-[0.92rem] font-extrabold text-green-ink shadow-sm transition-colors hover:bg-green-hover"
      >
        <span className="grid h-[21px] w-[21px] place-items-center rounded-full bg-green-ink/15 text-[1.05rem] leading-none">
          +
        </span>
        {addLabel}
      </button>
    </section>
  );
}
