// Decorative balloons floating behind a hero block. Drop it inside a
// `relative overflow-hidden` section; it fills the section and ignores clicks.
const BALLOONS = [
  { size: 70, color: "var(--color-balloon-pink)", left: "4%", top: "14%", delay: "0s" },
  { size: 52, color: "var(--color-balloon-yellow)", left: "16%", top: "56%", delay: "1.2s" },
  { size: 60, color: "var(--color-balloon-blue)", right: "6%", top: "10%", delay: "0.6s" },
  { size: 44, color: "var(--color-balloon-orange)", right: "15%", top: "52%", delay: "1.8s" },
  { size: 38, color: "var(--color-balloon-pink)", right: "30%", top: "4%", delay: "2.3s" },
];

export default function FloatingBalloons() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      {BALLOONS.map((balloon, index) => (
        <span
          key={index}
          className="animate-float absolute rounded-full opacity-50"
          style={{
            width: balloon.size,
            height: balloon.size * 1.18,
            background: balloon.color,
            left: balloon.left,
            right: balloon.right,
            top: balloon.top,
            animationDelay: balloon.delay,
          }}
        />
      ))}
    </div>
  );
}
