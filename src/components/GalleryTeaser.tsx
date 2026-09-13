import Link from "next/link";

// Placeholder tiles until real photos land in the `catalog` Storage bucket
// (gallery/{theme-slug}/NN.webp — see catalog-and-images.md).
const THEMES = [
  { label: "Рожден ден · Замък на Елза", gradient: "from-balloon-pink to-cta" },
  { label: "Кръщене · Небесно синьо", gradient: "from-balloon-blue to-[#3E93B4]" },
  { label: "Първи рожден ден · Цифра 1", gradient: "from-balloon-yellow to-[#E9A23B]" },
  { label: "Bride to be · Пастел", gradient: "from-balloon-orange to-[#E86A45]" },
];

export default function GalleryTeaser() {
  return (
    <section id="gallery" className="py-[52px]">
      <div className="mx-auto max-w-[1140px] px-5">
        <div className="mx-auto mb-[30px] max-w-[560px] text-center">
          <span className="text-[0.78rem] font-extrabold uppercase tracking-[0.12em] text-cta">
            Галерия
          </span>
          <h2 className="my-1.5 text-[clamp(1.5rem,3vw,2rem)]">Нашите украси</h2>
          <p className="text-muted">
            Разгледай реализирани декори по различни теми и поводи.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {THEMES.map((theme) => (
            <div
              key={theme.label}
              className={`flex aspect-[4/5] items-end rounded-item bg-gradient-to-b p-3.5 shadow-sm ${theme.gradient}`}
            >
              <span className="text-[0.95rem] font-extrabold text-white [text-shadow:0_1px_6px_rgb(0_0_0/0.35)]">
                {theme.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-[26px] text-center">
          <Link
            href="/gallery"
            className="inline-block rounded-full border-[1.5px] border-ink px-[26px] py-3 font-extrabold text-ink transition-colors hover:bg-ink hover:text-surface"
          >
            Виж всички украси
          </Link>
        </div>
      </div>
    </section>
  );
}
