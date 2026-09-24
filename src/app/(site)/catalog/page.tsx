import type { Metadata } from "next";
import CatalogView from "@/components/catalog/CatalogView";
import { getCatalog } from "@/lib/catalog";
import { parseState, toPlpData } from "@/lib/catalog-plp";

export const metadata: Metadata = {
  title: "Каталог",
  description:
    "Балонни декорации, арки, калъфи, фигурки и аксесоари под наем във Варна. Разгледайте каталога, филтрирайте по цвят и цена и добавете към офертата.",
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

  return <CatalogView data={data} initialState={initialState} />;
}
