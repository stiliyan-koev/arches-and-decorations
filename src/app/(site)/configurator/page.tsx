import type { Metadata } from "next";
import Configurator from "@/components/Configurator";
import CategoryTiles from "@/components/CategoryTiles";
import GalleryTeaser from "@/components/GalleryTeaser";
import FloatingBalloons from "@/components/FloatingBalloons";
import { getCatalog } from "@/lib/catalog";

// The old homepage, kept as a hidden backup: same configurator, same
// behaviour, but nothing links here and search engines are told to skip it.
export const metadata: Metadata = {
  title: "Конфигуратор",
  robots: { index: false, follow: false },
};

export default async function ConfiguratorPage() {
  const groups = await getCatalog();

  return (
    <>
      <section id="calc" className="relative overflow-hidden pt-11 pb-15">
        <FloatingBalloons />

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
