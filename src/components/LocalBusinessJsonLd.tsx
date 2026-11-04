import { CONTACTS } from "@/lib/contacts";
import { SITE_URL } from "@/lib/site";

// Tells search engines in a form they read directly (schema.org JSON-LD)
// that this is a local business in Varna, with its phone and social pages.
// No street address: she comes to the customer, so the city is enough.
// Deliberately no rating: there are no reviews on the site to back one up,
// and a made-up one gets the site penalised.
export default function LocalBusinessJsonLd() {
  const business = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#business`,
    name: CONTACTS.brand,
    description:
      "Украса с балони и арки за рождени дни, кръщенета, сватби и партита във Варна.",
    url: SITE_URL,
    telephone: CONTACTS.phoneHref.replace("tel:", ""),
    image: `${SITE_URL}/opengraph-image`,
    address: {
      "@type": "PostalAddress",
      addressLocality: CONTACTS.city,
      addressCountry: "BG",
    },
    areaServed: { "@type": "City", name: CONTACTS.city },
    sameAs: [CONTACTS.facebook, CONTACTS.tiktok],
  };

  return (
    <script
      type="application/ld+json"
      // Escaping "<" keeps any text in the data from closing the script tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(business).replace(/</g, "\\u003c"),
      }}
    />
  );
}
