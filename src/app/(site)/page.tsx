import Configurator from "@/components/Configurator";
import CategoryTiles from "@/components/CategoryTiles";
import GalleryTeaser from "@/components/GalleryTeaser";
import { getCatalog } from "@/lib/catalog";

// Decorative balloons floating behind the hero.
const BALLOONS = [
  { size: 70, color: "var(--color-balloon-pink)", left: "4%", top: "14%", delay: "0s" },
  { size: 52, color: "var(--color-balloon-yellow)", left: "16%", top: "56%", delay: "1.2s" },
  { size: 60, color: "var(--color-balloon-blue)", right: "6%", top: "10%", delay: "0.6s" },
  { size: 44, color: "var(--color-balloon-orange)", right: "15%", top: "52%", delay: "1.8s" },
  { size: 38, color: "var(--color-balloon-pink)", right: "30%", top: "4%", delay: "2.3s" },
];

export default async function HomePage() {
  const groups = await getCatalog();

  return (
    <>
      <section id="calc" className="relative overflow-hidden pt-11 pb-15">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          {BALLOONS.map((balloon, index) => (
            <span
              key={index}
              className="animate-float absolute rounded-full opacity-50"
              style={{
                width: balloon.size,
                height: balloon.size * 1.18,
                background: balloon.color,
                left: balloon.left,
                right: balloon.right,
                top: balloon.top,
                animationDelay: balloon.delay,
              }}
            />
          ))}
        </div>

        <div className="mx-auto max-w-[1140px] px-5">
          <div className="relative z-10 mx-auto mb-[26px] max-w-[660px] text-center">
            <span className="text-[0.78rem] font-extrabold uppercase tracking-[0.12em] text-cta">
              Празнични украси · Варна
            </span>
            <h1 className="my-2 text-[clamp(1.9rem,4.4vw,3rem)]">
              Сглоби своята украса и виж цената веднага
            </h1>
            <p className="text-[1.06rem] text-muted">
              Избери какво искаш за твоя повод — арка, балони, фигурки — и
              получи ориентировъчна цена на момента.
            </p>
          </div>

          <Configurator groups={groups} />
        </div>
      </section>

      <CategoryTiles groups={groups} />
      <GalleryTeaser />
    </>
  );
}
