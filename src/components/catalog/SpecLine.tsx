"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { InfoIcon } from "@/components/home/Icons";

// The description line under a card's name. The card only has room for one
// line, so the first line of the description is the label, and anything after
// it opens with the (i) — e.g. „Възможност за персонализиране (i)“ → the details
// and the price note.
//
// A native <dialog> opened with showModal(), the same pattern as
// RequirementsDialog and ShowcaseCards: the top layer escapes the card's
// overflow, and Escape plus a tap on the backdrop come free. Not the Popover
// API, which Safari 16 and older don't have — there `[popover]` gets no UA
// `display: none`, so the details block and its ✕ render inline inside every
// card with a multi-line description, and the (i) does nothing at all.
export default function SpecLine({ spec, title }: { spec: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [label, ...rest] = spec.split(/\r?\n/);
  const details = rest.join("\n").trim();

  if (!details) {
    return (
      <p className="line-clamp-1 text-[0.78rem] leading-snug text-muted">{label}</p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-mx-1 min-h-[32px] self-start rounded-item px-1 py-1 text-left text-[0.78rem] leading-snug text-muted hover:text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
      >
        {/* Never clamped: the label is short on purpose, and a cut-off word
            („Възможност за…“) says nothing. It wraps whole, with the (i)
            right after its last word. */}
        {label}
        <span className="ml-1 inline-block align-[-3px] text-cta">
          <InfoIcon size={16} />
        </span>
        <span className="sr-only">— повече информация</span>
      </button>

      {/* Mounted only while it is open, so each opening starts fresh. */}
      {open && (
        <SpecDialog
          title={title}
          label={label}
          details={details}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function SpecDialog({
  title,
  label,
  details,
  onClose,
}: {
  title: string;
  label: string;
  details: string;
  onClose: () => void; // every way it closes ends here: ✕, Escape, the backdrop
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOnBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function handlePointerDown(event: PointerEvent<HTMLDialogElement>) {
    pressedOnBackdrop.current = event.target === event.currentTarget;
  }

  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    // The panel fills the dialog, so a click on the dialog itself landed on the
    // backdrop beside it. The press has to have started there too: selecting
    // text inside and releasing outside keeps it open.
    if (pressedOnBackdrop.current && event.target === event.currentTarget) {
      event.currentTarget.close();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className="m-auto w-[min(92vw,380px)] rounded-card border border-border bg-surface p-0 text-ink shadow-[0_20px_50px_rgb(59_47_66/0.25)] backdrop:bg-ink/40"
    >
      {/* relative, so the ✕ has something to anchor to. */}
      <div className="relative p-5">
        <p id={titleId} className="pr-8 text-[0.95rem] font-bold leading-tight">
          {title}
        </p>
        <p className="mt-1 text-[0.85rem] font-bold text-cta">{label}</p>
        <p className="mt-2.5 text-[0.88rem] leading-relaxed whitespace-pre-line text-muted">
          {details}
        </p>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Затвори"
          className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
        >
          ✕
        </button>
      </div>
    </dialog>
  );
}
