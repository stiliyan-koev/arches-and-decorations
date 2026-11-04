"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveLabourPrice } from "@/app/admin/actions";

const FIELD = "rounded-item border border-border-strong bg-bg px-3 py-2";

// „Труд за украса“ at the top of the admin catalog: one price, added once to
// every basket going as „Украса с монтаж от нас“. 0 = no label at all.
export default function LabourPriceForm({ price }: { price: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(price));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // A comma is what she'll type on a Bulgarian keyboard.
  const parsed = Number(value.replace(",", "."));
  const dirty = value.trim() !== "" && parsed !== price;

  async function handleSave() {
    setBusy(true);
    setError("");
    setSaved(false);

    const result = await saveLabourPrice(parsed);

    setBusy(false);
    if (!result.ok) return setError(result.error);
    setSaved(true);
    router.refresh();
  }

  return (
    <section className="mt-6 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[14rem] flex-1">
          <h2 className="text-base font-extrabold">Труд за украса</h2>
          <p className="text-[0.85rem] text-muted">
            Добавя се веднъж към всяка оферта „Украса с монтаж от нас“. 0 = без труд.
          </p>
        </div>

        <label className="flex items-center gap-2">
          <input
            inputMode="decimal"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setSaved(false);
            }}
            aria-label="Цена на труда в евро"
            className={`${FIELD} w-24 text-right font-bold tabular-nums`}
          />
          <span className="font-bold">€</span>
        </label>

        <button
          type="button"
          onClick={handleSave}
          disabled={busy || !dirty || !Number.isFinite(parsed)}
          className="cursor-pointer rounded-full bg-cta px-4 py-2 text-[0.85rem] font-extrabold text-white hover:bg-cta-strong disabled:opacity-40"
        >
          Запази
        </button>
        {saved && (
          <span className="text-[0.85rem] font-bold text-available">Запазено</span>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-item bg-booked/10 px-3 py-2 text-[0.85rem] font-bold text-booked">
          {error}
        </p>
      )}
    </section>
  );
}
