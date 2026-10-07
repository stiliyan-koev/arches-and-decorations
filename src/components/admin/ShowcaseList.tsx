"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { imageUrl } from "@/lib/images";
import { HOME_SHOWCASE_COUNT } from "@/lib/home";
import { deleteShowcase, swapShowcaseOrder } from "@/app/admin/actions";
import { SAVE_FAILED } from "@/lib/upload-photo";
import type { ActionResult } from "@/app/admin/actions";
import type { ShowcaseRow } from "@/lib/showcases";

const MOVE_BUTTON =
  "grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-border-strong bg-bg text-[1.1rem] font-extrabold text-ink hover:border-cta hover:text-cta disabled:cursor-default disabled:opacity-30";
const LINK_BUTTON =
  "cursor-pointer text-[0.8rem] font-extrabold hover:underline disabled:opacity-50";

// The showcases in the order she set. The homepage shows the first three that
// have a photo, so each row says whether it is one of them. ‹ › reorders,
// „Изтрий“ removes the showcase but keeps its photos in „Снимки“.
export default function ShowcaseList({ showcases }: { showcases: ShowcaseRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  // The ones the homepage shows: the first three with a photo.
  const onHome = showcases
    .filter((showcase) => showcase.showcase_photos.length > 0)
    .slice(0, HOME_SHOWCASE_COUNT)
    .map((showcase) => showcase.id);
  // The homepage shows none of them until all three are ready.
  const homeReady = onHome.length === HOME_SHOWCASE_COUNT;

  // Runs one save action with the busy message, then reloads the list.
  async function run(message: string, action: () => Promise<ActionResult>) {
    setError("");
    setBusy(message);
    let result;
    try {
      result = await action();
    } catch {
      result = { ok: false as const, error: SAVE_FAILED };
    }
    setBusy("");
    if (!result.ok) setError(result.error);
    router.refresh();
  }

  function handleMove(from: number, to: number) {
    const first = showcases[Math.min(from, to)];
    const second = showcases[Math.max(from, to)];
    run("Подреждане…", () =>
      swapShowcaseOrder(
        { id: first.id, sort: first.sort },
        { id: second.id, sort: second.sort },
      ),
    );
  }

  function handleDelete(showcase: ShowcaseRow) {
    const message = `Да изтрия украсата „${showcase.title}“? Снимките ѝ остават в „Снимки“.`;
    if (!confirm(message)) return;
    run("Изтриване…", () => deleteShowcase(showcase.id));
  }

  if (showcases.length === 0) {
    return (
      <p className="rounded-item border border-dashed border-border-strong px-4 py-6 text-center text-[0.9rem] text-muted">
        Още няма украси. Началната ще ги покаже, когато станат три.
      </p>
    );
  }

  return (
    <>
      {onHome.length < HOME_SHOWCASE_COUNT && (
        <p className="mb-4 rounded-item bg-surface-2 px-4 py-3 text-[0.9rem] font-bold text-ink">
          Началната ще ги покаже, когато станат три.
        </p>
      )}

      {busy && <p className="mb-3 text-[0.85rem] font-bold text-muted">{busy}</p>}
      {error && (
        <p className="mb-3 rounded-item bg-booked/10 px-3 py-2 text-[0.85rem] font-bold text-booked">
          {error}
        </p>
      )}

      <ul className="space-y-2">
        {showcases.map((showcase, index) => {
          const cover = showcase.showcase_photos[0];
          const count = showcase.showcase_photos.length;
          return (
            <li
              key={showcase.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-border bg-surface p-3"
            >
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  aria-label="Премести по-напред"
                  onClick={() => handleMove(index, index - 1)}
                  disabled={Boolean(busy) || index === 0}
                  className={MOVE_BUTTON}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Премести по-назад"
                  onClick={() => handleMove(index, index + 1)}
                  disabled={Boolean(busy) || index === showcases.length - 1}
                  className={MOVE_BUTTON}
                >
                  ›
                </button>
              </div>

              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-item bg-surface-2">
                {cover ? (
                  <Image
                    src={imageUrl(cover.photo.path)}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-[0.65rem] font-bold text-muted">
                    няма
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/showcases/${showcase.id}`}
                  className="block truncate font-extrabold hover:text-cta"
                >
                  {showcase.title}
                </Link>
                <p className="text-[0.8rem] text-muted">
                  {count === 1 ? "1 снимка" : `${count} снимки`}
                  {count === 0 && " · Добави снимка, за да се покаже"}
                </p>
              </div>

              {homeReady && onHome.includes(showcase.id) ? (
                <span className="rounded-full bg-green px-2.5 py-1 text-[0.7rem] font-extrabold text-green-ink">
                  На началната
                </span>
              ) : (
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[0.7rem] font-extrabold text-muted">
                  Не се показва
                </span>
              )}

              <div className="flex shrink-0 items-center gap-4">
                <Link
                  href={`/admin/showcases/${showcase.id}`}
                  className={`${LINK_BUTTON} text-cta`}
                >
                  Редактирай
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(showcase)}
                  disabled={Boolean(busy)}
                  className={`${LINK_BUTTON} text-booked`}
                >
                  Изтрий
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
