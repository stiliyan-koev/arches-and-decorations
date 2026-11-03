"use client";

import Link from "next/link";
import { setConsent, useConsent } from "@/lib/consent";

// Both buttons look the same on purpose: saying no has to be as easy as saying yes.
const BUTTON =
  "flex-1 rounded-full bg-ink px-5 py-2.5 font-bold text-white transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta sm:flex-none";

// Asks before the Google tag loads. Without NEXT_PUBLIC_GOOGLE_ADS_ID there's
// nothing to ask about, so it renders nothing. It doesn't block the page.
// z-45: over the floating basket and the summary bar (z-40), under the menus (z-50).
export default function CookieBanner() {
  const consent = useConsent();

  if (!process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || consent !== null) return null;

  return (
    <section
      aria-label="Бисквитки"
      className="fixed inset-x-0 bottom-0 z-45 border-t border-border bg-surface px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgb(59_47_66/0.12)]"
    >
      <div className="mx-auto flex max-w-[1140px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm text-muted">
          Ползваме бисквитки на Google Ads, за да виждаме дали рекламите ни водят
          до обаждания и запитвания. Зареждаме ги само ако приемете, а сайтът
          работи еднакво и без тях.{" "}
          <Link href="/privacy" className="font-semibold text-ink underline">
            Повече за поверителността
          </Link>
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            className={BUTTON}
            onClick={() => setConsent("granted")}
          >
            Приемам
          </button>
          <button
            type="button"
            className={BUTTON}
            onClick={() => setConsent("denied")}
          >
            Отказвам
          </button>
        </div>
      </div>
    </section>
  );
}
