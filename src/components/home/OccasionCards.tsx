import Link from "next/link";
import Image from "next/image";
import { OCCASIONS, PLACEHOLDER_COLORS } from "@/lib/home";
import { ArrowRightIcon, ArrowUpRightIcon } from "@/components/home/Icons";

// "Вдъхнови се по повод": one card per occasion, each opening the gallery
// filtered to it. Desktop: a 3-column grid. Phones: a swipe row.
export default function OccasionCards() {
  return (
    <section className="mx-auto max-w-[1140px] pt-2 pb-14 md:pt-4 md:pb-24">
      <div className="flex items-end justify-between gap-6 px-5">
        <div>
          <span className="text-xs font-extrabold tracking-[0.14em] text-cta uppercase md:text-[13px]">
            Галерия
          </span>
          <h2 className="mt-2 text-[26px] md:mt-2.5 md:text-[40px]">
            Вдъхнови се по повод
          </h2>
        </div>
        <Link
          href="/gallery"
          className="hidden items-center gap-2 border-b-2 border-balloon-pink py-2.5 font-extrabold text-ink transition-colors hover:border-cta hover:text-cta md:inline-flex"
        >
          Цялата галерия <ArrowRightIcon size={18} />
        </Link>
      </div>

      <ul className="no-scrollbar mt-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 md:mt-9 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible">
        {OCCASIONS.map((occasion, index) => (
          <li key={occasion.slug} className="w-[260px] shrink-0 snap-start md:w-auto">
            <Link
              href={`/gallery?occasion=${occasion.slug}`}
              className="group flex flex-col rounded-card text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-cta"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-card">
                <div
                  className={`absolute inset-0 transition-transform duration-[600ms] ease-out group-hover:scale-[1.04] motion-reduce:transition-none ${
                    PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]
                  }`}
                >
                  {occasion.src && (
                    <Image
                      src={occasion.src}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 360px, 260px"
                      className="object-cover"
                    />
                  )}
                </div>
                <span className="absolute top-4 right-4 hidden h-11 w-11 place-items-center rounded-full bg-white md:grid">
                  <ArrowUpRightIcon size={18} />
                </span>
              </div>
              <h3 className="mt-3.5 text-xl transition-colors group-hover:text-cta md:mt-5 md:text-2xl">
                {occasion.title}
              </h3>
              <p className="mt-1.5 text-[15px] leading-snug text-muted md:mt-2 md:text-base">
                {occasion.text}
              </p>
              <span className="mt-2.5 inline-flex items-center gap-1.5 text-[15px] font-extrabold text-cta md:mt-3 md:text-base">
                Виж украсите <ArrowRightIcon size={16} />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-center px-5 md:hidden">
        <Link
          href="/gallery"
          className="inline-flex h-12 items-center rounded-full border-[1.5px] border-ink px-6 text-[15px] font-extrabold text-ink"
        >
          Цялата галерия
        </Link>
      </div>
    </section>
  );
}
