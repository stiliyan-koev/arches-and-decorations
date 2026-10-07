"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SHOWCASE_BODY_MAX, SHOWCASE_TITLE_MAX } from "@/lib/home";
import { saveShowcase } from "@/app/admin/actions";
import { SAVE_FAILED } from "@/lib/upload-photo";

type Props = {
  showcase: { id: string; title: string; body: string } | null; // null = a new one
};

const FIELD =
  "w-full rounded-item border border-border-strong bg-bg px-3 py-2.5";
const LABEL =
  "block text-[0.78rem] font-extrabold tracking-[0.08em] text-muted uppercase";

// The title and text of a showcase. The text is plain: a blank line starts a
// new paragraph in the popup on the homepage.
export default function ShowcaseForm({ showcase }: Props) {
  const router = useRouter();
  const isNew = !showcase;

  const [title, setTitle] = useState(showcase?.title ?? "");
  const [body, setBody] = useState(showcase?.body ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);

    let result;
    try {
      result = await saveShowcase(showcase?.id ?? null, { title, body });
    } catch {
      result = { ok: false as const, error: SAVE_FAILED };
    }

    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }

    // A new showcase has nowhere to put photos until it exists, so go
    // straight to its edit page, where the photos are added. The button
    // stays busy while that page loads, so a second click can't make a copy.
    if (isNew && result.id) {
      router.push(`/admin/showcases/${result.id}`);
      return;
    }

    setBusy(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-card border border-border bg-surface p-5"
    >
      <h2 className="text-lg">{isNew ? "Нова украса" : "Заглавие и текст"}</h2>

      <label className="mt-4 block">
        <span className={LABEL}>Заглавие</span>
        <input
          required
          maxLength={SHOWCASE_TITLE_MAX}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setSaved(false);
          }}
          className={`mt-1.5 ${FIELD}`}
        />
      </label>

      <label className="mt-4 block">
        <span className={LABEL}>Текст</span>
        <textarea
          rows={6}
          maxLength={SHOWCASE_BODY_MAX}
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setSaved(false);
          }}
          className={`mt-1.5 ${FIELD}`}
        />
      </label>
      <p className="mt-1 flex flex-wrap justify-between gap-x-4 text-[0.8rem] text-muted">
        <span>Празен ред започва нов абзац.</span>
        <span className="tabular-nums">
          {body.length} / {SHOWCASE_BODY_MAX}
        </span>
      </p>

      {error && (
        <p className="mt-4 rounded-item bg-booked/10 px-3 py-2 text-[0.85rem] font-bold text-booked">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="cursor-pointer rounded-full bg-cta px-6 py-2.5 font-extrabold text-white hover:bg-cta-strong disabled:opacity-60"
        >
          {busy ? "Запазване…" : isNew ? "Създай украсата" : "Запази"}
        </button>

        {saved && (
          <span className="text-[0.85rem] font-bold text-available">
            Запазено ✓
          </span>
        )}
      </div>
    </form>
  );
}
