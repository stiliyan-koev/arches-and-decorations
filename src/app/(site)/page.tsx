import type { Metadata } from "next";
import Link from "next/link";
import FloatingBalloons from "@/components/FloatingBalloons";
import HeroCarousel from "@/components/home/HeroCarousel";
import OccasionCards from "@/components/home/OccasionCards";
import ShowcaseCards from "@/components/home/ShowcaseCards";
import Faq from "@/components/Faq";
import { ArrowRightIcon } from "@/components/home/Icons";
import { getHeroPhotos } from "@/lib/hero-photos";
import { getHomeShowcases } from "@/lib/showcases";
import { HOME_SHOWCASE_COUNT } from "@/lib/home";

export const metadata: Metadata = {
  title: { absolute: "Украса с балони и арки във Варна · Хубавото балонче" },
  description:
    "Балонни украси и арки за рождени дни, кръщенета и партита във Варна. Разгледай каталога и виж ориентировъчна цена.",
  alternates: { canonical: "/" },
};

// Served from the CDN and rebuilt at most every 5 minutes. Admin writes refresh
// it straight away (revalidatePath in admin/actions.ts). The short window also
// means a database hiccup that showed the placeholder tiles heals within
// minutes. Works because the reads below use the cookie-free client.
export const revalidate = 300;

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
      <div className="relative overflow-hidden pb-2">
        <FloatingBalloons layout="carousel" />
        <div className="relative z-10">
          <HeroCarousel photos={heroPhotos} />
        </div>
      </div>

      <section className="relative overflow-hidden">
        <FloatingBalloons />

        <div className="relative z-10 mx-auto flex max-w-[1140px] flex-col items-center px-5 pt-8 pb-11 text-center md:pt-16 md:pb-20">
          {/* The small eyebrow is the h1: it names the service and the city,
              which is what people search for. The big line under it is the
              call to action, styled like a heading but not one. */}
          <h1 className="font-body text-xs leading-normal font-extrabold tracking-[0.14em] text-cta uppercase md:text-[13px]">
            Украса с балони и арки във Варна
          </h1>
          <p className="mt-3 max-w-[900px] font-display text-[32px] leading-[1.12] font-semibold tracking-[-0.01em] text-balance md:mt-3.5 md:text-[52px]">
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
            {/* "тук" is the call to action itself: a pill button inside the heading.
                Sizes are in em so it scales with the heading on mobile and desktop. */}
            <Link
              href="/catalog"
              aria-label="Изчисли своята украса — към каталога"
              className="inline-flex items-center gap-[0.25em] rounded-full bg-cta py-[0.12em] pr-[0.45em] pl-[0.6em] align-[0.04em] text-[0.85em] text-white shadow-[0_6px_18px_rgb(201_58_114/0.35)] transition-[background-color,translate,box-shadow] hover:-translate-y-0.5 hover:bg-cta-strong hover:shadow-[0_10px_24px_rgb(201_58_114/0.4)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              тук
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[0.9em] w-[0.9em] -rotate-45"
              >
                {/* A hand tapping. It is squeezed horizontally so the fist stays
                    narrow, and shifted down to leave room for the rays above the
                    fingertip. The uneven scale also thins the stroke, so the group
                    asks for 2.8 and ends up drawing about as thick as the 2.2 of
                    the rays below — and both grow with the icon. */}
                <g transform="translate(2 2.8) scale(0.7 0.85)" strokeWidth={2.8}>
                  <path d="M10 9.5V4a2 2 0 0 0-4 0v10" />
                  <path d="M14 10V9a2 2 0 0 0-4 0v1" />
                  <path d="M18 11v-1a2 2 0 0 0-4 0" />
                  <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                </g>
                {/* Four rays fanning out from the fingertip, as on a tap icon. */}
                <path
                  strokeWidth={2.2}
                  d="M7.6 2.3V1.2M6 2.9 4.8 1.7M9.2 2.9 10.4 1.7M5.4 3.6 3.7 2.9"
                />
              </svg>
            </Link>
          </p>
          <p className="mt-3.5 max-w-[620px] text-[17px] text-muted md:mt-[18px] md:text-xl">
            Разгледай каталога, добави арките, балоните и фигурките, които
            харесваш, и виж ориентировъчна цена за целия декор.
          </p>
          <p className="mt-3.5 text-[13px] text-muted md:mt-4 md:text-sm">
            Цената е ориентировъчна — точната оферта уточняваме лично.
          </p>
        </div>
      </section>

      {/* Full width, so the balloons fill the margins beside the cards too. */}
      <div className="relative overflow-hidden">
        <FloatingBalloons layout="sides" />
        <div className="relative z-10">
          {showcases.length === HOME_SHOWCASE_COUNT ? (
            <ShowcaseCards showcases={showcases} />
          ) : (
            <OccasionCards />
          )}
        </div>
      </div>

      {/* The FAQ, the same component as on /faq, which the link opens. */}
      <section className="mx-auto max-w-[1140px] px-5 pb-14 md:pb-24">
        <div className="flex items-end justify-between gap-6">
          <div>
            <span className="text-xs font-extrabold tracking-[0.14em] text-cta uppercase md:text-[13px]">
              Въпроси
            </span>
            <h2 className="mt-2 text-[26px] md:mt-2.5 md:text-[40px]">
              Често задавани въпроси
            </h2>
          </div>
          <Link
            href="/faq"
            className="hidden items-center gap-2 border-b-2 border-balloon-pink py-2.5 font-extrabold text-ink transition-colors hover:border-cta hover:text-cta md:inline-flex"
          >
            Към страницата с въпроси <ArrowRightIcon size={18} />
          </Link>
        </div>
        <Faq
          groupHeading="h3"
          className="mt-6 space-y-8 md:mt-9 md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-10 md:space-y-0"
        />
        <div className="mt-6 flex justify-center md:hidden">
          <Link
            href="/faq"
            className="inline-flex h-12 items-center rounded-full border-[1.5px] border-ink px-6 text-[15px] font-extrabold text-ink"
          >
            Към страницата с въпроси
          </Link>
        </div>
      </section>
    </>
  );
}
