"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { submitContactMessage } from "@/app/actions";

// Same field styling as the configurator's ContactForm, so the two forms on
// the site look like one form.
const FIELD_LABEL =
  "mb-1.5 block text-xs font-extrabold uppercase tracking-[0.06em] text-muted";
const FIELD_INPUT =
  "w-full rounded-[10px] border border-border-strong bg-surface px-[11px] py-2.5 text-[0.95rem] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-rose-ink";

// „Пишете ни“ on /about. It doesn't book anything and doesn't touch the
// database — it emails the owner, who then calls back.
export default function ContactMessageForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot, see actions.ts
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);
    try {
      const result = await submitContactMessage({
        name,
        phone,
        email,
        message,
        website,
      });
      if (result.ok) {
        setSent(true);
      } else {
        setError(result.error);
      }
    } catch {
      // The action itself didn't get through — network drop, server down.
      setError(
        "Нещо се обърка при изпращането. Моля, опитайте отново или ни пишете по Messenger.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div
        className="rounded-card border border-border bg-surface p-6 text-center shadow-card"
        // Announced to screen readers the moment it replaces the form.
        role="status"
      >
        <p className="text-4xl">🎈</p>
        <h3 className="mt-3 font-serif text-xl text-ink">Благодарим!</h3>
        <p className="mt-2 text-sm text-muted">
          Получихме съобщението ви. Ще се свържем с вас в най-скоро време, за да
          уточним детайлите.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      // relative, so the off-screen honeypot below has a positioned ancestor
      className="relative rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h3 className="text-xl font-semibold text-ink">Пишете ни</h3>
      <p className="mt-2 text-sm text-muted">
        Оставете телефон и няколко думи за повода — ще се свържем с вас.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <div className="min-w-[150px] flex-1">
          <label className={FIELD_LABEL} htmlFor="contact-name">
            Вашето име
          </label>
          <input
            id="contact-name"
            type="text"
            required
            maxLength={200}
            autoComplete="name"
            className={FIELD_INPUT}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="min-w-[150px] flex-1">
          <label className={FIELD_LABEL} htmlFor="contact-phone">
            Телефон
          </label>
          <input
            id="contact-phone"
            type="tel"
            required
            maxLength={200}
            autoComplete="tel"
            placeholder="0888 ..."
            className={FIELD_INPUT}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-3">
        <label className={FIELD_LABEL} htmlFor="contact-email">
          Имейл <span className="font-bold normal-case">(по желание)</span>
        </label>
        <input
          id="contact-email"
          type="email"
          maxLength={200}
          autoComplete="email"
          className={FIELD_INPUT}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="mt-3">
        <label className={FIELD_LABEL} htmlFor="contact-message">
          Съобщение
        </label>
        <textarea
          id="contact-message"
          required
          rows={4}
          maxLength={3000}
          placeholder="Какъв е поводът, за коя дата и колко гости…"
          className={FIELD_INPUT}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {/* Honeypot: off-screen rather than display:none, which some bots skip.
          Deliberately not named „Website“ — password managers autofill URL-ish
          fields, and that would silently drop a real lead as a bot. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="contact-ref-code">Код</label>
        <input
          id="contact-ref-code"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 w-full cursor-pointer rounded-full bg-cta px-5 py-3 font-extrabold text-white transition-colors hover:bg-cta-strong focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Изпращане…" : "Изпрати съобщение"}
      </button>

      {error && (
        <p className="mt-3 text-sm font-semibold text-cta" role="alert">
          {error}
        </p>
      )}

      {/* GDPR notice, same as the request form's (ContactForm). */}
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Използваме контактите ви само за да ви отговорим — повече в{" "}
        <Link
          href="/privacy"
          target="_blank"
          className="font-semibold underline underline-offset-2 hover:text-ink"
        >
          Политиката за поверителност
        </Link>
        . Няма онлайн плащане и не се обвързвате с нищо.
      </p>
    </form>
  );
}
