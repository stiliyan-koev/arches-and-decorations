import type { Metadata } from "next";
import { Unbounded, Nunito, Playfair_Display } from "next/font/google";
import "./globals.css";

// Cyrillic subset is required — without it Bulgarian text renders as tofu boxes.
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
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
  title: {
    default: "Балони и арки — празнични украси във Варна",
    template: "%s · Балони и арки",
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
