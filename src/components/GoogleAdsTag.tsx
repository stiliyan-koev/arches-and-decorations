"use client";

import { useEffect } from "react";
import Script from "next/script";
import { useConsent } from "@/lib/consent";
import { contactChannelOf, trackContact } from "@/lib/tracking";

const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

// Loads the Google tag and counts clicks on contact links. Renders nothing
// without NEXT_PUBLIC_GOOGLE_ADS_ID, or until the visitor says yes in the cookie
// banner (CookieBanner.tsx).
// Someone who accepts after leaving the ?gclid= landing page isn't tied to the ad click, so the Ads numbers are a lower bound.
//
// One listener on the document instead of an onClick on each link: the links
// stay plain <a> tags in Server Components, and a new tel:, Viber or Messenger
// link anywhere on the site is counted without anyone having to remember it.
// It never calls preventDefault, so the link opens as usual.
//
// The listener is bound only after a yes. Without that gate it would exist for
// a visitor who declined — inert today only because trackContact() bails when
// window.gtag is undefined, which stops being true the moment anything else on
// the site defines it.
export default function GoogleAdsTag() {
  const consent = useConsent();

  useEffect(() => {
    if (!GOOGLE_ADS_ID || consent !== "granted") return;

    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const href = event.target.closest("a")?.getAttribute("href");
      const channel = href ? contactChannelOf(href) : null;
      if (channel) trackContact(channel);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [consent]);

  if (!GOOGLE_ADS_ID || consent !== "granted") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
        strategy="lazyOnload"
      />
      {/* This only runs after a yes, and the yes covers measuring conversions,
          not personalised ads. /privacy says the same.
          Keep enhanced conversions off in the Ads account: they could read the
          form's email and phone, and /privacy says those don't reach Google Ads. */}
      <Script id="google-ads-init" strategy="lazyOnload">
        {`window.dataLayer = window.dataLayer || [];
window.gtag = function () { window.dataLayer.push(arguments); };
window.gtag("consent", "default", {
  ad_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "denied",
  analytics_storage: "denied",
});
window.gtag("js", new Date());
window.gtag("config", "${GOOGLE_ADS_ID}");`}
      </Script>
    </>
  );
}
