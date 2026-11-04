import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { CONTACTS } from "@/lib/contacts";

// The picture Messenger, Viber, Facebook and TikTok show when someone shares
// a link to the site. Drawn once at build time, for every page. The font is
// a file in the repo because the default one has no Cyrillic, and
// next/font's files are in a format this renderer can't read.
export const alt = "Хубавото балонче — украса с балони и арки във Варна";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Colours from globals.css (bg, ink, muted, cta and the balloon pastels).
const BG = "#fff9f3";
const INK = "#3b2f42";
const MUTED = "#6e6377";
const CTA = "#c93a72";

// x, y, diameter, colour: a loose bunch on the right.
const BALLOONS = [
  { x: 820, y: 70, d: 230, color: "#f6a5c0" },
  { x: 990, y: 190, d: 180, color: "#9bd3e6" },
  { x: 760, y: 300, d: 170, color: "#fce08a" },
  { x: 930, y: 370, d: 200, color: "#ffb784" },
  { x: 1080, y: 40, d: 120, color: "#fce08a" },
];

export default async function OpengraphImage() {
  const font = await readFile(join(process.cwd(), "src/app/fonts/Unbounded-Bold.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: BG,
          fontFamily: "Unbounded",
        }}
      >
        {BALLOONS.map((balloon, index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              left: balloon.x,
              top: balloon.y,
              width: balloon.d,
              height: balloon.d * 1.15,
              borderRadius: "50%",
              background: balloon.color,
              display: "flex",
            }}
          >
            {/* The shine. */}
            <div
              style={{
                position: "absolute",
                left: balloon.d * 0.22,
                top: balloon.d * 0.18,
                width: balloon.d * 0.18,
                height: balloon.d * 0.26,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.55)",
              }}
            />
          </div>
        ))}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 80px",
            width: 760,
            height: "100%",
          }}
        >
          <div style={{ fontSize: 26, color: CTA, letterSpacing: 4 }}>
            ВАРНА
          </div>
          <div style={{ fontSize: 76, color: INK, lineHeight: 1.08, marginTop: 18 }}>
            {CONTACTS.brand}
          </div>
          <div style={{ fontSize: 34, color: MUTED, lineHeight: 1.3, marginTop: 28 }}>
            Украса с балони и арки за всеки празник
          </div>
          <div style={{ fontSize: 26, color: CTA, marginTop: 44 }}>
            ukrasivarna.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Unbounded", data: font, weight: 700, style: "normal" }],
    },
  );
}
