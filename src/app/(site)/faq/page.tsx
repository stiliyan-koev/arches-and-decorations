import type { Metadata } from "next";
import Link from "next/link";
import Faq from "@/components/Faq";
import { FAQ_GROUPS } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Често задавани въпроси",
  description:
    "Резервация, капаро, плащане, монтаж, наем на арки и калъфи: отговори на най-честите въпроси за украсата с балони във Варна.",
  alternates: { canonical: "/faq" },
};

// The same questions as on the homepage, on a page of their own: a link to
// send a customer, and a page search engines can show for a question.
export default function FaqPage() {
  // schema.org FAQPage: the questions and answers in a form search engines
  // and AI assistants read directly. Only here, not on the homepage too: the
  // same FAQ marked up twice confuses them.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_GROUPS.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    ),
  };

  return (
    <div className="mx-auto max-w-[760px] px-5 pt-14 pb-16">
      <script
        type="application/ld+json"
        // Escaping "<" keeps any text in the data from closing the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <h1 className="text-3xl font-bold text-ink sm:text-4xl">
        Често задавани въпроси
      </h1>
      <p className="mt-3 max-w-[620px] text-muted">
        Как протичат резервацията, плащането, монтажът и наемът. Ако не
        намирате отговор, пишете ни — ще отговорим лично.
      </p>

      <Faq groupHeading="h2" className="mt-10 space-y-10" />

      <p className="mt-12 text-center">
        <Link
          href="/about"
          className="inline-flex h-12 items-center rounded-full bg-cta px-7 text-[15px] font-extrabold text-white transition-colors hover:bg-cta-strong"
        >
          Свържете се с нас
        </Link>
      </p>
    </div>
  );
}
