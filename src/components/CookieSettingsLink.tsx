"use client";

import { resetConsent } from "@/lib/consent";

// The footer's way to change the answer given in the cookie banner. Withdrawing
// consent has to be as easy as giving it, so it's on every public page. Without
// NEXT_PUBLIC_GOOGLE_ADS_ID there's no banner, so there's no link either.
export default function CookieSettingsLink() {
  if (!process.env.NEXT_PUBLIC_GOOGLE_ADS_ID) return null;

  return (
    <>
      {" · "}
      <button
        type="button"
        onClick={resetConsent}
        className="cursor-pointer underline-offset-2 hover:underline"
      >
        Бисквитки
      </button>
    </>
  );
}
