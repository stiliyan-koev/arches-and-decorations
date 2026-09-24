"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      // Supabase says "Invalid login credentials" for both a wrong password and
      // an unknown address, on purpose. No reason to be more specific here.
      setError("Грешен имейл или парола.");
      setBusy(false);
      return;
    }

    // The session cookie is set now, but the server hasn't seen it — refresh()
    // re-runs the middleware, which forwards to the products list.
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-5 py-16">
      <h1 className="text-center text-2xl">Вход в админ панела</h1>
      <p className="mt-2 text-center text-[0.9rem] text-muted">
        Достъпът е само с покана.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-7 rounded-card border border-border bg-surface p-6 shadow-sm"
      >
        <label className="block text-[0.78rem] font-extrabold tracking-[0.08em] text-muted uppercase">
          Имейл
        </label>
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1.5 w-full rounded-item border border-border-strong bg-bg px-3 py-2.5"
        />

        <label className="mt-4 block text-[0.78rem] font-extrabold tracking-[0.08em] text-muted uppercase">
          Парола
        </label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1.5 w-full rounded-item border border-border-strong bg-bg px-3 py-2.5"
        />

        {error && (
          <p className="mt-4 rounded-item bg-booked/10 px-3 py-2 text-[0.85rem] font-bold text-booked">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full cursor-pointer rounded-full bg-cta px-5 py-3 font-extrabold text-white hover:bg-cta-strong disabled:opacity-60"
        >
          {busy ? "Влизане…" : "Вход"}
        </button>
      </form>
    </main>
  );
}
