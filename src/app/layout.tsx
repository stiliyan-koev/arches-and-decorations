import type { Metadata } from "next";
import { Unbounded, Nunito, Playfair_Display } from "next/font/google";
import { CONTACTS } from "@/lib/contacts";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Cyrillic subset is required — without it Bulgarian text renders as tofu boxes.
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  // Variable font, no fixed weights: Google serves the static 700 file from a
  // "/l/font?kit=…&skey=…" URL that Turbopack's font loader can't resolve.
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700", "800"],
});

// The configurator's serif titles, matching reference/configurator-v1_1_3.html.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  // Turns the relative canonical links and the share picture into full URLs.
  metadataBase: new URL(SITE_URL),
  // The share picture itself is opengraph-image.tsx next to this file.
  openGraph: {
    type: "website",
    locale: "bg_BG",
    siteName: CONTACTS.brand,
  },
  twitter: { card: "summary_large_image" },
  title: {
    default: "Хубавото балонче — празнични украси във Варна",
    template: "%s · Хубавото балонче",
  },
  description:
    "Сглоби своята украса и виж ориентировъчна цена веднага. Балонни декорации, арки и фигурки за рождени дни, кръщенета и сватби във Варна.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="bg"
      className={`${unbounded.variable} ${nunito.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
