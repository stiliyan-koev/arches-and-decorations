// Google Ads conversions. The tag itself is loaded by GoogleAdsTag.tsx, only when
// NEXT_PUBLIC_GOOGLE_ADS_ID is set and the visitor accepted the cookie banner.
// Otherwise nothing here does anything.

export type ContactChannel = "viber" | "messenger" | "phone" | "inquiry";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackContact(channel: ContactChannel) {
  const id = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const label = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONTACT_LABEL;
  if (!id || !label || typeof window.gtag !== "function") return;

  window.gtag("event", "conversion", { send_to: `${id}/${label}`, channel });
}

// Which contact channel a link opens, or null when it's any other link.
export function contactChannelOf(href: string): ContactChannel | null {
  if (href.startsWith("tel:")) return "phone";
  if (href.startsWith("viber:")) return "viber";
  if (href.startsWith("https://m.me/")) return "messenger";
  return null;
}
