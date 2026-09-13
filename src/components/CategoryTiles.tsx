import Link from "next/link";
import type { CatalogGroup } from "@/lib/types";

// Emoji + tint per category slug. Categories added later fall back to the
// default tile, so a new row in the DB never breaks this section.
const TILE_STYLES: Record<string, { emoji: string; tint: string }> = {
  arches: { emoji: "🌀", tint: "from-white to-[#FDEFF4]" },
  covers: { emoji: "🎀", tint: "from-white to-[#FFF6E2]" },
  balloons: { emoji: "🎈", tint: "from-white to-[#EAF7FB]" },
  "balloon-figures": { emoji: "🎂", tint: "from-white to-[#FFF0E6]" },
  "character-figures": { emoji: "🧸", tint: "from-white to-[#FDEFF4]" },
  signs: { emoji: "✨", tint: "from-white to-[#FFF6E2]" },
  props: { emoji: "🪞", tint: "from-white to-[#EAF7FB]" },
};

const DEFAULT_TILE = { emoji: "🎉", tint: "from-white to-[#FDEFF4]" };

export default function CategoryTiles({ groups }: { groups: CatalogGroup[] }) {
  return (
    <section id="catalog" className="bg-surface-2 py-[52px]">
      <div className="mx-auto max-w-[1140px] px-5">
        <div className="mx-auto mb-[30px] max-w-[560px] text-center">
          <span className="text-[0.78rem] font-extrabold uppercase tracking-[0.12em] text-cta">
            Каталог
          </span>
          <h2 className="my-1.5 text-[clamp(1.5rem,3vw,2rem)]">
            Какво предлагаме
          </h2>
          <p className="text-muted">
            Всичко за арки, балони и фигурки под наем — или с изработка на място.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3.5">
          {groups.map((group) => {
            const tile = TILE_STYLES[group.slug] ?? DEFAULT_TILE;

            return (
              <Link
                key={group.id}
                href={`/catalog/${group.slug}`}
                className={`rounded-item border border-border bg-gradient-to-b ${tile.tint} px-3.5 py-5 text-center font-extrabold text-ink shadow-sm transition-transform hover:-translate-y-[3px]`}
              >
                <span className="mb-2 block text-[1.7rem]">{tile.emoji}</span>
                {group.name}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
