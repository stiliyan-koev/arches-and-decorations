import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CatalogView from "@/components/catalog/CatalogView";
import { getCatalog } from "@/lib/catalog";
import { parseState, toPlpData } from "@/lib/catalog-plp";
import { getLabourPrice } from "@/lib/settings";

// Shared per-request so generateMetadata and the page don't both hit the DB.
const loadData = cache(async () => toPlpData(await getCatalog()));

export async function generateMetadata({
  params,
}: PageProps<"/catalog/[category]">): Promise<Metadata> {
  const { category } = await params;
  const data = await loadData();
  const match = data.categories.find((c) => c.slug === category);
  if (!match) return { title: "Каталог" };

  return {
    title: `${match.name} във Варна`,
    // Her own text for the category (admin → Категории) when she has one.
    description:
      match.description ||
      `${match.name} за празници във Варна — разгледайте наличните продукти с ориентировъчни цени, филтрирайте по цвят и добавете към офертата.`,
    // Filters and sort only reorder this list, so every variant points here.
    alternates: { canonical: `/catalog/${category}` },
  };
}

// Same PLP as /catalog, with this category preselected. /catalog/arches and
// /catalog?cat=arches render the same list.
export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/catalog/[category]">) {
  const [{ category }, sp, data, labourPrice] = await Promise.all([
    params,
    searchParams,
    loadData(),
    getLabourPrice(),
  ]);

  const known = data.categories.some((c) => c.slug === category);
  if (!known) notFound();

  const initialState = { ...parseState(sp, data), cats: [category] };

  return (
    <CatalogView
      data={data}
      initialState={initialState}
      labourPrice={labourPrice}
    />
  );
}
