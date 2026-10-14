import Link from "next/link";
import MobileNav from "@/components/MobileNav";
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
      <div className="mx-auto flex max-w-[1140px] items-center gap-[18px] px-5 py-3">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 font-display text-base leading-tight font-bold sm:gap-2.5 sm:text-[1.15rem]"
        >
          <span className="shrink-0 text-[1.4rem] leading-none">🎈</span>
          <span className="truncate">{CONTACTS.brand}</span>
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

        {/* Phones: the same links behind a burger, so the header stays one row. */}
        <MobileNav items={NAV} />
      </div>
    </header>
  );
}
