import type { Metadata } from "next";
import Link from "next/link";
import FloatingBalloons from "@/components/FloatingBalloons";
import HeroCarousel from "@/components/home/HeroCarousel";
import OccasionCards from "@/components/home/OccasionCards";
import { ArrowRightIcon } from "@/components/home/Icons";
import { getHeroPhotos } from "@/lib/hero-photos";

export const metadata: Metadata = {
  title: { absolute: "Балони и арки — празнични украси във Варна" },
  description:
    "Балонни украси и арки за рождени дни, кръщенета и партита във Варна. Разгледай каталога и виж ориентировъчна цена.",
};

// The homepage: photos of finished work, a call to open the catalog, and the
// gallery by occasion. The catalog is the main flow now; the old configurator
// homepage lives on at /configurator as a hidden backup.
export default async function HomePage() {
  const heroPhotos = await getHeroPhotos();

  return (
    <>
      <HeroCarousel photos={heroPhotos} />

      <section className="relative overflow-hidden">
        <FloatingBalloons />

        <div className="relative z-10 mx-auto flex max-w-[1140px] flex-col items-center px-5 pt-10 pb-11 text-center md:pt-[72px] md:pb-20">
          <span className="text-xs font-extrabold tracking-[0.14em] text-cta uppercase md:text-[13px]">
            Празнични украси · Варна
          </span>
          <h1 className="mt-3 max-w-[900px] text-[32px] md:mt-3.5 md:text-[52px]">
            Изчисли своята{" "}
            <span
              className="px-1 md:px-1.5"
              style={{
                background:
                  "linear-gradient(transparent 62%, var(--color-balloon-yellow) 62%)",
              }}
            >
              украса
            </span>
          </h1>
          <p className="mt-3.5 max-w-[620px] text-[17px] text-muted md:mt-[18px] md:text-xl">
            Разгледай каталога, добави арките, балоните и фигурките, които
            харесваш, и виж ориентировъчна цена за целия декор.
          </p>
          <Link
            href="/catalog"
            className="mt-6 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full bg-cta px-[30px] text-[17px] font-extrabold text-white shadow-[0_10px_24px_rgb(201_58_114/0.28)] transition-[background-color,transform] hover:-translate-y-px hover:bg-cta-strong md:mt-8 md:inline-flex md:h-14 md:w-auto md:gap-3 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
          >
            Към каталога <ArrowRightIcon />
          </Link>
          <p className="mt-3.5 text-[13px] text-muted md:mt-4 md:text-sm">
            Цената е ориентировъчна — точната оферта уточняваме лично.
          </p>
        </div>
      </section>

      <OccasionCards />
    </>
  );
}
