import Link from "next/link";
import { CONTACTS } from "@/lib/contacts";

const NAV = [
  { href: "/", label: "Начало" },
  { href: "/catalog", label: "Каталог" },
  { href: "/gallery", label: "Галерия" },
  { href: "/about", label: "За нас" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-[10px]">
      <div className="mx-auto flex max-w-[1140px] items-center gap-[18px] px-5 py-3.5">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-base leading-tight font-bold sm:gap-2.5 sm:text-[1.15rem]"
        >
          <span className="text-[1.4rem] leading-none">🎈</span>
          {CONTACTS.brand}
        </Link>

        <nav className="ml-auto hidden gap-[22px] text-[0.95rem] font-bold md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="opacity-85 transition-colors hover:text-cta hover:opacity-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <a
          href={CONTACTS.phoneHref}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3 py-2 text-sm font-extrabold whitespace-nowrap shadow-sm transition-colors hover:border-cta sm:px-4 sm:py-2.5 sm:text-base md:ml-0"
        >
          📞 {CONTACTS.phone}
        </a>
      </div>

      {/* Mobile: the desktop nav is hidden, so show the links as a second row. */}
      <nav className="mx-auto flex max-w-[1140px] justify-between gap-3 border-t border-border px-5 py-2.5 text-[0.95rem] font-bold md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="opacity-85 transition-colors hover:text-cta hover:opacity-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
