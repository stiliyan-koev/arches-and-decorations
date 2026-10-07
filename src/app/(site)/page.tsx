import type { Metadata } from "next";
import Link from "next/link";
import FloatingBalloons from "@/components/FloatingBalloons";
import HeroCarousel from "@/components/home/HeroCarousel";
import OccasionCards from "@/components/home/OccasionCards";
import ShowcaseCards from "@/components/home/ShowcaseCards";
import { getHeroPhotos } from "@/lib/hero-photos";
import { getHomeShowcases } from "@/lib/showcases";
import { HOME_SHOWCASE_COUNT } from "@/lib/home";

export const metadata: Metadata = {
  title: { absolute: "Балони и арки — празнични украси във Варна" },
  description:
    "Балонни украси и арки за рождени дни, кръщенета и партита във Варна. Разгледай каталога и виж ориентировъчна цена.",
};

// The homepage: photos of finished work, a call to open the catalog, and three
// finished decorations up close (the showcases from /admin/showcases). Until
// three showcases have photos, the gallery-by-occasion cards stand in for
// them. The catalog is the main flow now; the old configurator homepage lives
// on at /configurator as a hidden backup.
export default async function HomePage() {
  const [heroPhotos, showcases] = await Promise.all([
    getHeroPhotos(),
    getHomeShowcases(),
  ]);

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
            </span>{" "}
            {/* "тук" is the call to action itself: an underlined link inside the heading. */}
            <Link
              href="/catalog"
              aria-label="Изчисли своята украса — към каталога"
              className="text-cta underline decoration-[0.08em] underline-offset-[0.15em] transition-colors hover:text-cta-strong focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
            >
              тук
            </Link>
          </h1>
          <p className="mt-3.5 max-w-[620px] text-[17px] text-muted md:mt-[18px] md:text-xl">
            Разгледай каталога, добави арките, балоните и фигурките, които
            харесваш, и виж ориентировъчна цена за целия декор.
          </p>
          <p className="mt-3.5 text-[13px] text-muted md:mt-4 md:text-sm">
            Цената е ориентировъчна — точната оферта уточняваме лично.
          </p>
        </div>
      </section>

      {showcases.length === HOME_SHOWCASE_COUNT ? (
        <ShowcaseCards showcases={showcases} />
      ) : (
        <OccasionCards />
      )}
    </>
  );
}
