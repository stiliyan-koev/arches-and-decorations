"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCarouselSettings } from "@/app/admin/actions";
import PhotoManager from "@/components/admin/PhotoManager";
import type { ProductImage } from "@/lib/types";

type Settings = {
  carousel: boolean;
  carousel_in_configurator: boolean;
  carousel_in_catalog: boolean;
};

type Props = {
  productId: string;
  productSlug: string;
  settings: Settings;
  images: ProductImage[]; // this product's carousel photos, in order
};

// The carousel panel on the product editor: the master switch, where the
// carousel shows, and its photos. Each tick saves at once, like the photos do.
// Switching it off only hides the carousel; the photos stay for next time.
export default function CarouselManager({
  productId,
  productSlug,
  settings: initial,
  images,
}: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function update(change: Partial<Settings>) {
    const previous = settings;
    const next = { ...settings, ...change };
    setSettings(next);
    setError("");
    setBusy(true);

    let result;
    try {
      result = await saveCarouselSettings(productId, next);
    } catch {
      result = { ok: false as const, error: "Запазването се провали. Опитайте отново." };
    }
    setBusy(false);

    if (!result.ok) {
      setSettings(previous); // put the tick back where the database has it
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const nowhere =
    !settings.carousel_in_configurator && !settings.carousel_in_catalog;

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="text-lg">Карусел</h2>
      <p className="mt-1 text-[0.85rem] text-muted">
        Няколко снимки на различните варианти, които клиентът разглежда една
        след друга. Показва се вместо основната снимка.
      </p>

      <label className="mt-4 flex items-center gap-2.5 text-[0.9rem] font-bold">
        <input
          type="checkbox"
          checked={settings.carousel}
          disabled={busy}
          onChange={(event) => update({ carousel: event.target.checked })}
        />
        Покажи карусел за този продукт
      </label>

      {error && (
        <p className="mt-3 rounded-item bg-booked/10 px-3 py-2 text-[0.85rem] font-bold text-booked">
          {error}
        </p>
      )}

      {!settings.carousel && images.length > 0 && (
        <p className="mt-2 text-[0.85rem] text-muted">
          Каруселът е изключен. Снимките му ({images.length}) са запазени.
        </p>
      )}

      {settings.carousel && (
        <>
          <fieldset className="mt-4 rounded-item border border-border px-4 pt-2 pb-3">
            <legend className="px-1 text-[0.78rem] font-extrabold tracking-[0.08em] text-muted uppercase">
              Къде да се показва
            </legend>
            <div className="grid gap-2.5 text-[0.9rem] font-bold sm:grid-cols-2">
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={settings.carousel_in_configurator}
                  disabled={busy}
                  onChange={(event) =>
                    update({ carousel_in_configurator: event.target.checked })
                  }
                />
                В прозореца на конфигуратора
              </label>
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={settings.carousel_in_catalog}
                  disabled={busy}
                  onChange={(event) =>
                    update({ carousel_in_catalog: event.target.checked })
                  }
                />
                В каталога
              </label>
            </div>
            {nowhere && (
              <p className="mt-2 text-[0.8rem] text-muted">
                Не е избрано място — каруселът няма да се вижда никъде.
              </p>
            )}
          </fieldset>

          <p className="mt-4 text-[0.85rem] text-muted">
            Всяка снимка се наглася в същата рамка като останалите, за да
            изглеждат еднакво в карусела. Подредете ги със стрелките — така
            ще се показват.
          </p>

          <PhotoManager
            productId={productId}
            productSlug={productSlug}
            colors={[]}
            images={images}
            carousel
          />
        </>
      )}
    </section>
  );
}
