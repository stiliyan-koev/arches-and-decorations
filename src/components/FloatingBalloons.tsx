// Decorative balloons floating behind a block. Drop it inside a
// `relative overflow-hidden` wrapper; it fills the wrapper and ignores clicks.
//
// Mobile first: on a phone the text fills the width, so the balloons there
// keep to the screen edges and the empty corners above and below the text.
// A negative px left/right lets one peek in from the edge by the same amount
// on every width (at most 20px, the text's side padding). Corner balloons are
// placed in px from the top or bottom, because the block's height changes
// with the width. Balloons marked `wide` sit where the text is on a phone and
// only show from lg (1024px) up, where there is room beside it.
//
// Each list runs top to bottom. A balloon with a negative top, or one too low
// to fit, hangs over the wrapper's edge and gets clipped. Clip only against
// the header or footer: where two balloon blocks meet, the cut shows as a
// straight line, so the balloons there stay whole. The float lifts each one
// 16px, so a whole one starts at least that far below the top.
type Balloon = {
  size: number;
  color: string;
  left?: string | number;
  right?: string | number;
  top?: string | number;
  bottom?: number;
  delay: string;
  wide?: boolean;
};

// "hero": all over a heading block. Whole at both edges: the homepage stacks
// it between the carousel and the cards.
const HERO_BALLOONS: Balloon[] = [
  { size: 30, color: "var(--color-balloon-yellow)", left: "4%", top: 18, delay: "1.7s" },
  { size: 34, color: "var(--color-balloon-blue)", right: "4%", top: 22, delay: "0.6s" },
  { size: 46, color: "var(--color-balloon-blue)", left: "26%", top: "7%", delay: "0.9s", wide: true },
  { size: 48, color: "var(--color-balloon-pink)", left: -28, top: "22%", delay: "0s" },
  { size: 32, color: "var(--color-balloon-yellow)", right: "18%", top: "24%", delay: "1.5s", wide: true },
  { size: 44, color: "var(--color-balloon-orange)", right: -24, top: "40%", delay: "1.8s" },
  { size: 52, color: "var(--color-balloon-orange)", left: "12%", top: "56%", delay: "1.2s", wide: true },
  { size: 44, color: "var(--color-balloon-yellow)", left: -24, top: "62%", delay: "3.1s" },
  { size: 40, color: "var(--color-balloon-pink)", right: -20, top: "76%", delay: "2s" },
  { size: 40, color: "var(--color-balloon-blue)", right: "24%", top: "80%", delay: "2.4s", wide: true },
  { size: 38, color: "var(--color-balloon-pink)", left: "51%", top: "87%", delay: "1.9s", wide: true },
  { size: 30, color: "var(--color-balloon-blue)", left: "4%", bottom: 6, delay: "0.1s" },
  { size: 28, color: "var(--color-balloon-orange)", right: "5%", bottom: 8, delay: "1.4s" },
];

// "carousel": behind the photo carousel, peeking out wherever the photos aren't
// (its empty half at the start, the gaps around the turned photos, the arrow
// row). Nothing is clipped at the bottom, where the hero block's top row starts.
const CAROUSEL_BALLOONS: Balloon[] = [
  { size: 44, color: "var(--color-balloon-pink)", left: "3%", top: "-4%", delay: "1.3s" },
  { size: 40, color: "var(--color-balloon-blue)", right: "3%", top: "2%", delay: "0.2s" },
  { size: 52, color: "var(--color-balloon-yellow)", left: "29%", top: "10%", delay: "0.6s", wide: true },
  { size: 58, color: "var(--color-balloon-orange)", left: "8%", top: "20%", delay: "2.2s", wide: true },
  { size: 44, color: "var(--color-balloon-yellow)", right: "1%", top: "40%", delay: "2.9s" },
  { size: 50, color: "var(--color-balloon-pink)", left: "1%", top: "44%", delay: "0s" },
  { size: 36, color: "var(--color-balloon-orange)", right: -16, top: "64%", delay: "2.5s" },
  { size: 52, color: "var(--color-balloon-orange)", left: "27%", top: "66%", delay: "0.8s", wide: true },
  { size: 38, color: "var(--color-balloon-blue)", left: -18, top: "70%", delay: "3.3s" },
  { size: 40, color: "var(--color-balloon-pink)", right: "12%", top: "70%", delay: "1.9s", wide: true },
  { size: 30, color: "var(--color-balloon-yellow)", left: "18%", top: "86%", delay: "2.7s", wide: true },
  { size: 36, color: "var(--color-balloon-blue)", right: "30%", top: "86%", delay: "1.1s", wide: true },
];

// "sides": around a row of photo cards, which would hide anything behind them.
// Mostly down the left and right edges (the empty margins on wide screens),
// plus one in the gap beside the section title and a few along the bottom.
const SIDE_BALLOONS: Balloon[] = [
  { size: 28, color: "var(--color-balloon-yellow)", left: "44%", top: "3%", delay: "2.2s", wide: true },
  { size: 50, color: "var(--color-balloon-blue)", right: -30, top: 20, delay: "0.7s" },
  { size: 56, color: "var(--color-balloon-pink)", left: "2%", top: "16%", delay: "0s", wide: true },
  { size: 44, color: "var(--color-balloon-blue)", left: "7%", top: "28%", delay: "0.4s", wide: true },
  { size: 44, color: "var(--color-balloon-pink)", right: "8%", top: "30%", delay: "1.2s", wide: true },
  { size: 46, color: "var(--color-balloon-blue)", left: -26, top: "38%", delay: "2.6s" },
  { size: 50, color: "var(--color-balloon-yellow)", left: "10%", top: "58%", delay: "3s", wide: true },
  { size: 54, color: "var(--color-balloon-yellow)", right: "2%", top: "60%", delay: "1s", wide: true },
  { size: 46, color: "var(--color-balloon-orange)", right: "2%", bottom: 6, delay: "3.5s" },
  { size: 42, color: "var(--color-balloon-orange)", left: "15%", bottom: 6, delay: "1.4s" },
  { size: 30, color: "var(--color-balloon-pink)", left: "34%", bottom: 4, delay: "0.9s" },
];

const LAYOUTS = {
  hero: HERO_BALLOONS,
  carousel: CAROUSEL_BALLOONS,
  sides: SIDE_BALLOONS,
};

export default function FloatingBalloons({
  layout = "hero",
}: {
  layout?: keyof typeof LAYOUTS;
}) {
  const balloons = LAYOUTS[layout];

  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      {balloons.map((balloon, index) => (
        <span
          key={index}
          className={`animate-float absolute rounded-full opacity-50 ${
            balloon.wide ? "hidden lg:block" : ""
          }`}
          style={{
            width: balloon.size,
            height: balloon.size * 1.18,
            background: balloon.color,
            left: balloon.left,
            right: balloon.right,
            top: balloon.top,
            bottom: balloon.bottom,
            animationDelay: balloon.delay,
          }}
        />
      ))}
    </div>
  );
}
