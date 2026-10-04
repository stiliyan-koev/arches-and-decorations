"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TAG_NAME_MAX } from "@/lib/gallery";
import type { GalleryTag } from "@/lib/gallery";
import {
  createGalleryTag,
  deleteGalleryTag,
  renameGalleryTag,
} from "@/app/admin/actions";

const SAVE_FAILED = "Запазването се провали. Опитайте отново.";

const INPUT =
  "min-w-0 flex-1 rounded-item border border-border-strong bg-bg px-3 py-2 text-[0.9rem]";
const SAVE_BUTTON =
  "shrink-0 cursor-pointer rounded-full bg-cta px-4 text-[0.8rem] font-extrabold text-white hover:bg-cta-strong disabled:cursor-default disabled:opacity-40";

// The tags she files photos under: add, rename, remove. Every change is saved
// at once. A tag with no photos stays here but is not shown on the site.
export default function GalleryTagManager({ tags }: { tags: GalleryTag[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  // Runs one save action with the busy message, then reloads the list.
  async function run(message: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    setBusy(message);
    let result;
    try {
      result = await action();
    } catch {
      result = { ok: false, error: SAVE_FAILED };
    }
    setBusy("");
    if (!result.ok) setError(result.error ?? SAVE_FAILED);
    router.refresh();
    return result.ok;
  }

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="text-lg">Етикети</h2>
      <p className="mt-1 text-[0.85rem] text-muted">
        Например „Сватба“, „Рожден ден“, „Frozen“. Една снимка може да има
        няколко етикета.
      </p>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (await run("Добавяне…", () => createGalleryTag(newName))) setNewName("");
        }}
        className="mt-4 flex max-w-md gap-2"
      >
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          maxLength={TAG_NAME_MAX}
          placeholder="Нов етикет"
          aria-label="Име на нов етикет"
          className={INPUT}
        />
        <button
          type="submit"
          disabled={Boolean(busy) || newName.trim() === ""}
          className={SAVE_BUTTON}
        >
          Добави
        </button>
      </form>

      {busy && <p className="mt-3 text-[0.85rem] font-bold text-muted">{busy}</p>}
      {error && (
        <p className="mt-3 rounded-item bg-booked/10 px-3 py-2 text-[0.85rem] font-bold text-booked">
          {error}
        </p>
      )}

      {tags.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {tags.map((tag) => (
            <TagRow
              key={`${tag.id}-${tag.name}`}
              tag={tag}
              disabled={Boolean(busy)}
              onRename={(name) => run("Запазване…", () => renameGalleryTag(tag.id, name))}
              onDelete={() => {
                const photos = tag.count === 1 ? "1 снимка" : `${tag.count} снимки`;
                if (!confirm(`Да изтрия етикета „${tag.name}“? Снимките остават (${photos}), само губят етикета.`)) return;
                run("Изтриване…", () => deleteGalleryTag(tag.id));
              }}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

// One tag: its name (editable), how many photos it has, delete.
function TagRow({
  tag,
  disabled,
  onRename,
  onDelete,
}: {
  tag: GalleryTag;
  disabled: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(tag.name);
  const changed = name.trim() !== tag.name && name.trim() !== "";

  return (
    <li className="flex items-center gap-2 rounded-item border border-border bg-bg px-2 py-1.5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (changed) onRename(name);
        }}
        className="flex min-w-0 flex-1 gap-1.5"
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={TAG_NAME_MAX}
          aria-label={`Име на етикет ${tag.name}`}
          className="min-w-0 flex-1 rounded-item border border-border-strong bg-surface px-2 py-1.5 text-[0.85rem]"
        />
        <button type="submit" disabled={disabled || !changed} className={SAVE_BUTTON}>
          Запази
        </button>
      </form>
      <span className="shrink-0 text-[0.75rem] font-bold text-muted tabular-nums">
        {tag.count} сн.
      </span>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        className="shrink-0 cursor-pointer text-[0.75rem] font-extrabold text-booked hover:underline disabled:opacity-50"
      >
        Изтрий
      </button>
    </li>
  );
}
