import type { MetadataRoute } from "next";
import { getCatalog, isSupabaseConfigured } from "@/lib/catalog";
import { FALLBACK_GROUPS } from "@/lib/catalog-fallback";
import { toPlpData } from "@/lib/catalog-plp";
import { getRentEnabled } from "@/lib/settings";
import { getPublicGalleryTags } from "@/lib/gallery-photos";
import { getShowcaseLinks } from "@/lib/showcases";
import { galleryHref } from "@/lib/gallery";
import { HOME_SHOWCASE_COUNT } from "@/lib/home";
import { SITE_URL } from "@/lib/site";

// /sitemap.xml: every page search engines should know about, read from the
// database so a new category or gallery tag shows up on its own. /request
// and /configurator are noindex and the admin is private, so they're not here.
// Rebuilt at most every 5 minutes, like the pages it lists: without this Next
// would build it once, at deploy, and miss everything added since.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["/", "/catalog", "/gallery", "/about", "/faq", "/privacy"];

  // On a DB error getCatalog() hands back the seed snapshot, whose slugs may
  // not exist on the live site, so leave the categories out this time. Without
  // Supabase at all (local, no env) the snapshot is the catalog, so keep it.
  const [groups, rentEnabled] = await Promise.all([getCatalog(), getRentEnabled()]);
  const dbFailed = isSupabaseConfigured() && groups === FALLBACK_GROUPS;
  const categories = dbFailed
    ? []
    : toPlpData(groups, rentEnabled).categories.map((category) => `/catalog/${category.slug}`);

  let tags: string[] = [];
  let showcases: string[] = [];
  if (isSupabaseConfigured()) {
    try {
      tags = (await getPublicGalleryTags()).map((tag) => galleryHref(tag));
    } catch (error) {
      console.error("sitemap: leaving out the gallery tags", error);
    }
    try {
      // „Вдъхнови се“ on the homepage is the only way in, and it appears only
      // once three showcases have photos. Below that, submitting these pages
      // would offer search engines something nothing on the site links to.
      const links = await getShowcaseLinks();
      if (links.length >= HOME_SHOWCASE_COUNT) {
        showcases = links.map((link) => `/showcases/${link.slug}`);
      }
    } catch (error) {
      console.error("sitemap: leaving out the showcases", error);
    }
  }

  return [...pages, ...categories, ...tags, ...showcases].map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
  }));
}
