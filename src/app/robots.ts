import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// /robots.txt. The admin stays out of search. A Netlify deploy preview or
// branch deploy (CONTEXT is set by Netlify at build time) is kept out
// entirely, so a half-finished version never shows up next to the real site.
export default function robots(): MetadataRoute.Robots {
  const isPreview = process.env.CONTEXT && process.env.CONTEXT !== "production";
  if (isPreview) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
