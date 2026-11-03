"use client";

import { useEffect } from "react";
import Script from "next/script";
import { contactChannelOf, trackContact } from "@/lib/tracking";

const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

// Loads the Google tag and counts clicks on contact links. Renders nothing
// without NEXT_PUBLIC_GOOGLE_ADS_ID.
//
// One listener on the document instead of an onClick on each link: the links
// stay plain <a> tags in Server Components, and a new tel:, Viber or Messenger
// link anywhere on the site is counted without anyone having to remember it.
// It never calls preventDefault, so the link opens as usual.
export default function GoogleAdsTag() {
  useEffect(() => {
    if (!GOOGLE_ADS_ID) return;

    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const href = event.target.closest("a")?.getAttribute("href");
      const channel = href ? contactChannelOf(href) : null;
      if (channel) trackContact(channel);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  if (!GOOGLE_ADS_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
window.gtag = function () { window.dataLayer.push(arguments); };
window.gtag("js", new Date());
window.gtag("config", "${GOOGLE_ADS_ID}");`}
      </Script>
    </>
  );
}
