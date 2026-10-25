import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Страницата не е намерена",
};

// Every unknown URL lands here, and so does notFound() from any page. It sits
// at the root, outside the (site) group, so it brings the site's header and
// footer itself. Next adds the noindex tag on its own.
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 pt-14 pb-16 text-center">
          <p className="font-display text-6xl font-bold text-cta">404</p>
          <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">
            Страницата не е намерена
          </h1>
          <p className="mt-4 text-lg text-muted">
            Може адресът да е сгрешен или страницата да е преместена. Ето откъде
            да продължите:
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/catalog"
              className="inline-flex h-12 items-center rounded-full bg-cta px-6 font-extrabold text-white transition-colors hover:bg-cta-strong"
            >
              Към каталога
            </Link>
            <Link
              href="/gallery"
              className="inline-flex h-12 items-center rounded-full border-[1.5px] border-ink px-6 font-extrabold text-ink"
            >
              Галерия
            </Link>
            <Link
              href="/"
              className="inline-flex h-12 items-center rounded-full border-[1.5px] border-ink px-6 font-extrabold text-ink"
            >
              Начало
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
