import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import CatalogView from "@/components/catalog/CatalogView";
import { getCatalog } from "@/lib/catalog";
import { catalogHref, parseState, toPlpData } from "@/lib/catalog-plp";
import { getLabourPrice } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Каталог",
  description:
    "Балонни декорации, арки, калъфи, фигурки и аксесоари под наем във Варна. Разгледайте каталога, филтрирайте по цвят и цена и добавете към офертата.",
  // ?cat=, ?color=, ?sort= … are views of this one list.
  alternates: { canonical: "/catalog" },
};

// The catalog listing (PLP). Server-rendered from the DB for SEO; the initial
// filter/sort view is parsed from the URL here so the first paint already matches
// a shared or reloaded link. All further filtering runs client-side.
export default async function CatalogPage({
  searchParams,
}: PageProps<"/catalog">) {
  const [groups, params] = await Promise.all([getCatalog(), searchParams]);
  const data = toPlpData(groups);
  const initialState = parseState(params, data);

  // One category has its own page, /catalog/<slug>. Old ?cat= links move there,
  // so search engines see one address for it. Unknown slugs are already dropped
  // by parseState, so a bogus ?cat= still shows the full catalog.
  if (initialState.cats.length === 1) {
    permanentRedirect(catalogHref(initialState));
  }

  // After the redirect: a legacy ?cat= hit never needs the price.
  const labourPrice = await getLabourPrice();

  return (
    <CatalogView
      data={data}
      initialState={initialState}
      labourPrice={labourPrice}
    />
  );
}
