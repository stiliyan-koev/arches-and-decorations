import type { Metadata } from "next";
import Link from "next/link";
import RequestForm from "@/components/basket/RequestForm";
import { getCatalog } from "@/lib/catalog";
import { toPlpData } from "@/lib/catalog-plp";

// The order summary behind the catalog's mini-basket. The basket itself lives in
// the visitor's browser, so this page only hands the form the catalog to look
// the picked slugs up in. Personal to each visitor, so search engines skip it.
export const metadata: Metadata = {
  title: "Вашето запитване",
  robots: { index: false, follow: false },
};

export default async function RequestPage() {
  const { products } = toPlpData(await getCatalog());

  return (
    <div className="mx-auto max-w-[1140px] px-5 pt-6 pb-16">
      <nav className="mb-2 text-[0.8rem] text-muted">
        <Link href="/" className="hover:text-cta">
          Начало
        </Link>{" "}
        ·{" "}
        <Link href="/catalog" className="hover:text-cta">
          Каталог
        </Link>{" "}
        · Запитване
      </nav>
      <h1 className="text-[clamp(2rem,4vw,2.6rem)] font-bold">
        Вашето запитване
      </h1>
      <p className="mt-2 mb-6 max-w-[640px] text-[0.95rem] text-muted">
        Прегледайте избраното, кажете ни кога и къде, и оставете телефон. Няма
        плащане — ще се свържем с вас, за да уточним всичко на лична среща.
      </p>

      <RequestForm products={products} />
    </div>
  );
}
