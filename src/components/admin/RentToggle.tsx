"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveRentEnabled } from "@/app/admin/actions";

// The „Под наем“ switch at the top of the admin catalog. Off, the site offers
// only „Украса с монтаж“: see toPlpData in catalog-plp.ts. Saves on click.
export default function RentToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(next: boolean) {
    setBusy(true);
    setError("");

    try {
      const result = await saveRentEnabled(next);
      if (!result.ok) return setError(result.error);
      setChecked(next);
      router.refresh();
    } catch {
      // The action itself failed (network drop, server down), not the data.
      setError("Нещо се обърка при записването. Опитайте отново.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-card border border-border bg-surface p-4">
      <label className="flex flex-wrap items-center gap-3">
        <span className="min-w-[14rem] flex-1">
          <span className="block text-base font-extrabold">Под наем</span>
          <span className="block text-[0.85rem] text-muted">
            Изключено: каталогът предлага само „Украса с монтаж от нас“, а
            продуктите само под наем се скриват, докато не го включите отново.
          </span>
        </span>

        <input
          type="checkbox"
          checked={checked}
          disabled={busy}
          onChange={(event) => handleChange(event.target.checked)}
          className="h-5 w-5 cursor-pointer disabled:opacity-40"
        />
        <span className="w-24 font-bold">
          {checked ? "Показва се" : "Скрито"}
        </span>
      </label>

      {error && (
        <p className="mt-3 rounded-item bg-booked/10 px-3 py-2 text-[0.85rem] font-bold text-booked">
          {error}
        </p>
      )}
    </section>
  );
}
