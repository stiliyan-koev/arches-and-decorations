import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import CatalogView from "@/components/catalog/CatalogView";
import { getCatalog } from "@/lib/catalog";
import { catalogHref, parseState, toPlpData } from "@/lib/catalog-plp";
import { getLabourPrice, getRentEnabled } from "@/lib/settings";

export const metadata: Metadata = {
  // Not the bare section word: this is the site's main commercial list, so the
  // title names what is on it. Distinct from the homepage's „Украса с балони и
  // арки във Варна“ so the two don't compete for the same phrase.
  title: "Каталог — балони, арки и калъфи за украса във Варна",
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
  const [groups, params, labourPrice, rentEnabled] = await Promise.all([
    getCatalog(),
    searchParams,
    getLabourPrice(),
    getRentEnabled(),
  ]);
  const data = toPlpData(groups, rentEnabled);
  const initialState = parseState(params, data);

  // One category has its own page, /catalog/<slug>. Old ?cat= links move there,
  // so search engines see one address for it. Unknown slugs are already dropped
  // by parseState, so a bogus ?cat= still shows the full catalog.
  if (initialState.cats.length === 1) {
    permanentRedirect(catalogHref(initialState));
  }

  return (
    <CatalogView
      data={data}
      initialState={initialState}
      labourPrice={labourPrice}
    />
  );
}
