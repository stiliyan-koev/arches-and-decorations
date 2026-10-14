"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";

type NavItem = { href: string; label: string };

// The phone navigation: a burger that opens a sheet from the right. The links
// used to sit in a second header row, which ate vertical space and squeezed
// four labels onto one line. Hidden from md up, where SiteHeader shows the
// links inline.
export default function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const burgerRef = useRef<HTMLButtonElement>(null);

  // Close and put focus back on the burger. Without this, the node that had
  // focus unmounts with the sheet and focus falls to <body>. Link clicks
  // navigate away, so they close without the focus hop.
  const closeSheet = useCallback(() => {
    setOpen(false);
    burgerRef.current?.focus();
  }, []);

  // Escape to close, and lock the page behind the sheet while it's open.
  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeSheet();
    }
    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, closeSheet]);

  // md:hidden on the sheet too: it is portalled to <body>, so the wrapper's
  // md:hidden does not reach it. Crossing the breakpoint while open (a phone
  // rotated to landscape) would otherwise leave the sheet up next to the
  // desktop nav.
  const sheet = (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Меню"
    >
      <button
        type="button"
        aria-label="Затвори менюто"
        tabIndex={-1}
        onClick={closeSheet}
        className="absolute inset-0 bg-ink/40"
      />

      <div className="animate-drawer-in absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col bg-bg shadow-[-20px_0_50px_rgb(59_47_66/0.18)]">
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          <span className="flex-1 font-display text-lg font-semibold">Меню</span>
          <button
            type="button"
            autoFocus
            aria-label="Затвори"
            onClick={closeSheet}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col px-3 py-3">
          {items.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`rounded-item px-3 py-3.5 text-[1.05rem] font-bold ${
                  active ? "bg-surface-2 text-cta" : "text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );

  return (
    <div className="ml-auto md:hidden">
      <button
        type="button"
        ref={burgerRef}
        aria-label="Меню"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="grid h-11 w-11 place-items-center rounded-full border border-border bg-surface text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
      >
        <BurgerIcon />
      </button>

      {/* Portalled to <body> on purpose: SiteHeader has backdrop-blur, and a
          backdrop-filter makes an element the containing block for its
          position:fixed children — left in place, the sheet would be clipped
          to the header's own height. */}
      {open && createPortal(sheet, document.body)}
    </div>
  );
}

function BurgerIcon() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M1 1h18" />
        <path d="M1 7h18" />
        <path d="M1 13h18" />
      </g>
    </svg>
  );
}
