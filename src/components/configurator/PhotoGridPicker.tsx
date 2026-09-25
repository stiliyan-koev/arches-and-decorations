import Image from "next/image";
import { fullImagePath, imageUrl } from "@/lib/images";
import PhotoViewer from "@/components/PhotoViewer";
import type { ProductImage } from "@/lib/types";

export type GridChoice = {
  id: string;
  name: string;
  priceLabel: string;
  photo: ProductImage | null;
  disabled: boolean;
};

type Props = {
  label: string;
  choices: GridChoice[];
  selectedId: string;
  onPick: (id: string) => void;
};

// The alternative to the product dropdown, used when a category's picker = 'grid'
// (the character figures). Three columns on desktop, two on mobile; the selected
// card gets a rose ring and a check. Exhausted items are disabled.
//
// Each choice is a `relative` wrapper with two siblings: the pick button and the
// full-size viewer button. A button inside a button is invalid HTML, so the
// viewer can't live inside the pick button. The viewer takes the top-right
// corner, so the "✓" sits top-left.
export default function PhotoGridPicker({
  label,
  choices,
  selectedId,
  onPick,
}: Props) {
  return (
    <div>
      <span className="mb-2 block text-[0.72rem] font-extrabold tracking-[0.06em] text-muted uppercase">
        {label}
      </span>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {choices.map((choice) => {
          const selected = choice.id === selectedId;
          return (
            <div key={choice.id} className="relative flex">
              <button
                type="button"
                aria-pressed={selected}
                disabled={choice.disabled}
                onClick={() => onPick(choice.id)}
                className={`relative flex w-full flex-col overflow-hidden rounded-item border bg-surface text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                  selected
                    ? "border-rose shadow-[0_0_0_3px_rgb(196_140_162/0.18)]"
                    : "border-border-strong hover:border-rose"
                }`}
              >
                {selected && (
                  <span className="absolute top-1.5 left-1.5 z-10 grid h-[22px] w-[22px] place-items-center rounded-full bg-rose text-[0.78rem] text-white">
                    ✓
                  </span>
                )}
                <span className="grid aspect-square w-full place-items-center border-b border-border bg-bg">
                  {choice.photo ? (
                    <Image
                      src={imageUrl(choice.photo.path)}
                      alt={choice.name}
                      width={200}
                      height={200}
                      sizes="(max-width: 640px) 45vw, 140px"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="px-2 text-center text-[0.7rem] text-muted">
                      Снимка предстои
                    </span>
                  )}
                </span>
                <span className="px-2.5 pt-2 text-[0.78rem] leading-tight font-extrabold">
                  {choice.name}
                </span>
                <span className="px-2.5 pb-2.5 text-[0.75rem] font-bold text-muted">
                  {choice.priceLabel}
                  {choice.disabled ? " · няма свободни" : ""}
                </span>
              </button>
              {choice.photo && (
                <PhotoViewer
                  src={imageUrl(fullImagePath(choice.photo))}
                  alt={choice.name}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
