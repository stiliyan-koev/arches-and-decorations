import type { MetadataRoute } from "next";
import { getCatalog, isSupabaseConfigured } from "@/lib/catalog";
import { toPlpData } from "@/lib/catalog-plp";
import { getPublicGalleryTags } from "@/lib/gallery-photos";
import { galleryHref } from "@/lib/gallery";
import { SITE_URL } from "@/lib/site";

// /sitemap.xml: every page search engines should know about, read from the
// database so a new category or gallery tag shows up on its own. /request
// and /configurator are noindex and the admin is private, so they're not here.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["/", "/catalog", "/gallery", "/about", "/privacy"];

  const categories = toPlpData(await getCatalog()).categories.map(
    (category) => `/catalog/${category.slug}`,
  );

  let tags: string[] = [];
  if (isSupabaseConfigured()) {
    try {
      tags = (await getPublicGalleryTags()).map((tag) => galleryHref(tag));
    } catch (error) {
      console.error("sitemap: leaving out the gallery tags", error);
    }
  }

  return [...pages, ...categories, ...tags].map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
  }));
}
