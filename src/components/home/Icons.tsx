import type { ReactNode } from "react";

// Small stroke icons used on the homepage. Decorative: the text or aria-label
// next to them says what they mean. They take the current text colour.

type Props = { size?: number };

function Icon({ size = 20, children }: Props & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function ArrowRightIcon({ size }: Props) {
  return (
    <Icon size={size}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </Icon>
  );
}

export function ArrowUpRightIcon({ size }: Props) {
  return (
    <Icon size={size}>
      <path d="M7 17L17 7" />
      <path d="M8 7h9v9" />
    </Icon>
  );
}

export function ChevronLeftIcon({ size }: Props) {
  return (
    <Icon size={size}>
      <path d="M15 18l-6-6 6-6" />
    </Icon>
  );
}

export function ChevronRightIcon({ size }: Props) {
  return (
    <Icon size={size}>
      <path d="M9 18l6-6-6-6" />
    </Icon>
  );
}

export function ChevronDownIcon({ size }: Props) {
  return (
    <Icon size={size}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  );
}

export function InfoIcon({ size }: Props) {
  return (
    <Icon size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </Icon>
  );
}
