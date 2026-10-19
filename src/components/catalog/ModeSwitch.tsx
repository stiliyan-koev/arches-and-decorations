"use client";

import type { Mode } from "@/lib/catalog-plp";

const OPTIONS: { value: Mode; title: string; sub: string; icon: "balloon" | "box" }[] = [
  {
    value: "service",
    title: "Украса с монтаж от нас",
    sub: "Декорираме на място",
    icon: "balloon",
  },
  {
    value: "rent",
    title: "Под наем",
    sub: "Вземате и връщате сами",
    icon: "box",
  },
];

// The big switch at the top of the catalog: „Украса с монтаж“ or „Само под
// наем“. It decides what the catalog lists (rent drops what can't be rented on
// its own) and whether the basket gets „Труд за украса“. The pink pill slides
// under the chosen side.
export default function ModeSwitch({
  mode,
  onMode,
}: {
  mode: Mode;
  onMode: (mode: Mode) => void;
}) {
  return (
    <fieldset className="mb-6 max-w-[760px]">
      <legend className="mb-2 text-[0.72rem] font-extrabold tracking-[0.12em] text-cta uppercase">
        Как да е украсата?
      </legend>
      <div className="relative grid grid-cols-2 rounded-[22px] border-2 border-balloon-pink bg-surface p-1.5 shadow-sm">
        <span
          aria-hidden
          className={`absolute inset-y-1.5 left-1.5 w-[calc(50%-0.375rem)] rounded-[16px] bg-cta shadow-[0_6px_18px_rgb(201_58_114/0.35)] transition-transform duration-300 ease-out motion-reduce:transition-none ${
            mode === "rent" ? "translate-x-full" : ""
          }`}
        />
        {OPTIONS.map((option) => {
          const active = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onMode(option.value)}
              className={`relative flex min-h-[64px] items-center gap-3 rounded-[16px] px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta sm:px-5 ${
                active ? "text-white" : "text-ink hover:bg-surface-2"
              }`}
            >
              <span
                aria-hidden
                className={`hidden h-10 w-10 shrink-0 place-items-center rounded-full sm:grid ${
                  active ? "bg-white/20" : "bg-surface-2 text-cta"
                }`}
              >
                <ModeIcon name={option.icon} />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[0.86rem] leading-tight font-semibold sm:text-[1rem]">
                  {option.title}
                </span>
                <span
                  className={`mt-0.5 block text-[0.72rem] leading-snug sm:text-[0.8rem] ${
                    active ? "text-white/85" : "text-muted"
                  }`}
                >
                  {option.sub}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ModeIcon({ name }: { name: "balloon" | "box" }) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "balloon" ? (
        <>
          <path d="M12 2a6 6 0 0 0-6 6c0 4 3.4 7 6 7s6-3 6-7a6 6 0 0 0-6-6z" />
          <path d="M11 17h2l-1-2z" />
          <path d="M12 17c0 2-2 2.5-2 5" />
        </>
      ) : (
        <>
          <path d="M21 8 12 3 3 8l9 5z" />
          <path d="M3 8v8l9 5 9-5V8" />
          <path d="M12 13v8" />
        </>
      )}
    </svg>
  );
}
