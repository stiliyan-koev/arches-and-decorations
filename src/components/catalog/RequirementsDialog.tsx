"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { REQUIREMENTS_MAX } from "@/lib/selection";

// The box „Добави“ opens for a product with „Прозорец за изисквания“ (a custom
// label, a name on a sign): the customer describes what they want, and the
// text goes into the basket with the line. Writing nothing is fine — the
// product is added all the same and she asks at the meeting.
//
// A native <dialog> opened with showModal(), like ShowcaseCards: Escape, the
// backdrop and the top layer come free. The card mounts it only while it's
// asking, so every opening starts with an empty box.
export default function RequirementsDialog({
  title,
  onAdd,
  onClose,
}: {
  title: string; // the product, and its colour when it has one
  onAdd: (requirements: string) => void;
  // Every way it closes ends here: adding, „Отказ“, Escape, a click beside it.
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const titleId = useId();
  const textId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    // Straight into the box: writing is the only thing to do here.
    textRef.current?.focus();
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // Closed first, so focus is back on „Добави“ before the mini-basket opens
    // and remembers where to return to.
    dialogRef.current?.close();
    onAdd(text.trim());
  }

  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    // The form fills the dialog, so a click on the dialog itself is a click
    // on the dark backdrop beside it.
    if (event.target === event.currentTarget) event.currentTarget.close();
  }

  // Phones: near the top, so the keyboard doesn't cover it. Wider: centred.
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={handleDialogClick}
      className="mx-auto mt-[10vh] mb-auto w-[min(92vw,440px)] rounded-card border border-border bg-surface p-0 text-ink shadow-[0_20px_50px_rgb(59_47_66/0.25)] backdrop:bg-ink/40 sm:my-auto"
    >
      <form onSubmit={handleSubmit} className="p-5">
        <p id={titleId} className="text-[0.95rem] leading-tight font-bold">
          {title}
        </p>

        <label
          htmlFor={textId}
          className="mt-4 mb-1.5 block text-[0.72rem] font-extrabold tracking-[0.06em] text-muted uppercase"
        >
          Опишете вашите изисквания
        </label>
        <textarea
          id={textId}
          ref={textRef}
          rows={4}
          maxLength={REQUIREMENTS_MAX}
          placeholder="Напр. текстът на надписа, цветове, размер…"
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="w-full rounded-[10px] border border-border-strong bg-bg px-[11px] py-2.5 text-base text-ink focus:outline-2 focus:outline-offset-2 focus:outline-rose-ink"
        />
        <p className="mt-1.5 text-[0.78rem] leading-snug text-muted">
          Не сте сигурни? Оставете празно — ще го уточним лично.
        </p>

        <div className="mt-5 flex flex-wrap justify-end gap-2.5">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="min-h-[44px] rounded-full border border-balloon-pink bg-surface px-5 text-sm font-extrabold text-cta hover:bg-surface-2 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
          >
            Отказ
          </button>
          <button
            type="submit"
            className="min-h-[44px] rounded-full bg-cta px-5 text-sm font-extrabold text-white hover:bg-cta-strong focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
          >
            Добави към офертата
          </button>
        </div>
      </form>
    </dialog>
  );
}
