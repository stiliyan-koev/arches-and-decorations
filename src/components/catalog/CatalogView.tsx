"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Filters from "@/components/catalog/Filters";
import FilterSheet from "@/components/catalog/FilterSheet";
import ProductCard from "@/components/catalog/ProductCard";
import OfferButton from "@/components/catalog/OfferButton";
import FloatingOfferButton from "@/components/catalog/FloatingOfferButton";
import MiniBasket from "@/components/basket/MiniBasket";
import { ChevronDownIcon } from "@/components/home/Icons";
import {
  activeFilterCount,
  buildQuery,
  BANDS,
  EMPTY_STATE,
  hasActiveFilters,
  SORTS,
  visibleProducts,
  type FilterState,
  type Mode,
  type PlpData,
  type SortKey,
} from "@/lib/catalog-plp";

// How many cards to render before "Покажи още". Generous so today's small
// catalog shows in full; a larger catalog gets a show-more instead of pagination.
const PAGE = 24;

function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export default function CatalogView({
  data,
  initialState,
}: {
  data: PlpData;
  initialState: FilterState;
}) {
  const [state, setState] = useState<FilterState>(initialState);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  // The mini-basket drawer. `lastAdded` names the product whose „Добави“ opened
  // it (null when opened from the pill); `basketFull` is set when an add was
  // refused; `openedFrom` gets focus back on close.
  const [basketOpen, setBasketOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [basketFull, setBasketFull] = useState(false);
  const openedFrom = useRef<HTMLElement | null>(null);
  // Whether the „Вашата оферта“ pill is on screen. When it isn't, the floating
  // basket button takes its place.
  const pillRef = useRef<HTMLDivElement>(null);
  const [pillInView, setPillInView] = useState(true);

  // Keep the URL in step with the view so it survives a reload and can be shared.
  // replaceState, not push — Back should leave the catalog, not undo nine filter
  // clicks. Everything lives on /catalog as a query string; a pretty
  // /catalog/[category] entry (still server-rendered for SEO) canonicalises onto
  // /catalog?cat=… here. Only writes when the URL would actually change, so it's
  // a no-op on a matching reload and doesn't depend on effect-timing quirks.
  useEffect(() => {
    const target = `/catalog${buildQuery(state)}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (target !== current) {
      window.history.replaceState(null, "", target);
    }
  }, [state]);

  // The top margin is the sticky site header (two rows on phones): a pill
  // tucked under it counts as out of view.
  useEffect(() => {
    const pill = pillRef.current;
    if (!pill) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPillInView(entry.isIntersecting),
      { rootMargin: "-110px 0px 0px 0px" },
    );
    observer.observe(pill);
    return () => observer.disconnect();
  }, []);

  const visible = visibleProducts(data.products, state);
  const shown = visible.slice(0, limit);
  const activeCount = activeFilterCount(state);
  const filtersActive = hasActiveFilters(state);

  // --- state updates ---
  const setMode = (mode: Mode) => setState((s) => ({ ...s, mode }));
  const setSort = (sort: SortKey) => setState((s) => ({ ...s, sort }));
  const toggleCat = (slug: string) =>
    setState((s) => ({ ...s, cats: toggle(s.cats, slug) }));
  const toggleColor = (slug: string) =>
    setState((s) => ({ ...s, colors: toggle(s.colors, slug) }));
  const toggleBand = (id: string) =>
    setState((s) => ({ ...s, bands: toggle(s.bands, id) }));
  // Reset the facets but keep the chosen sort (matches the reference).
  const clearFilters = () => setState((s) => ({ ...EMPTY_STATE, sort: s.sort }));

  function openBasket(addedSlug: string | null, full = false) {
    openedFrom.current = document.activeElement as HTMLElement | null;
    setLastAdded(addedSlug);
    setBasketFull(full);
    setBasketOpen(true);
  }

  // Stable, because the drawer's Escape listener depends on it.
  const closeBasket = useCallback(() => {
    setBasketOpen(false);
    openedFrom.current?.focus();
  }, []);

  const closeSheet = () => {
    setSheetOpen(false);
    filterButtonRef.current?.focus();
  };

  // Active-filter chips, each removable.
  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (state.mode === "rent") {
    chips.push({
      key: "mode",
      label: "Само под наем",
      onRemove: () => setMode("service"),
    });
  }
  for (const slug of state.cats) {
    const name = data.categories.find((c) => c.slug === slug)?.name ?? slug;
    chips.push({ key: `cat-${slug}`, label: name, onRemove: () => toggleCat(slug) });
  }
  for (const slug of state.colors) {
    const name = data.colors.find((c) => c.slug === slug)?.name ?? slug;
    chips.push({
      key: `color-${slug}`,
      label: name,
      onRemove: () => toggleColor(slug),
    });
  }
  for (const id of state.bands) {
    const label = BANDS.find((b) => b.id === id)?.label ?? id;
    chips.push({ key: `band-${id}`, label, onRemove: () => toggleBand(id) });
  }

  const countWord = visible.length === 1 ? "продукт" : "продукта";

  // The browser's own arrow ignores the padding and hugs the rounded edge, so
  // it is hidden (appearance-none) and our chevron sits 1rem in, like the text.
  const sortSelect = (
    <span className="relative inline-flex">
      <select
        aria-label="Подреди по"
        value={state.sort}
        onChange={(e) => setSort(e.target.value as SortKey)}
        className="min-h-[44px] appearance-none rounded-full border border-border-strong bg-surface pr-10 pl-4 text-sm font-semibold focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
      >
        {SORTS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2">
        <ChevronDownIcon size={16} />
      </span>
    </span>
  );

  return (
    <div className="mx-auto max-w-[1140px] px-5 pt-6 pb-16">
      <p className="mb-5 flex items-center gap-2.5 rounded-item border border-border bg-surface-2 px-4 py-3 text-[0.82rem] text-muted">
        <span className="h-2 w-2 shrink-0 rounded-full bg-balloon-orange" />
        Предварителен преглед · Цените са примерни. Крайната оферта уточняваме
        лично.
      </p>

      {/* Head */}
      <div className="mb-6 flex flex-wrap items-end gap-x-8 gap-y-4">
        <div className="flex flex-1 flex-col gap-2">
          <nav className="text-[0.8rem] text-muted">
            <Link href="/" className="hover:text-cta">
              Начало
            </Link>{" "}
            · Каталог
          </nav>
          <h1 className="text-[clamp(2rem,4vw,2.6rem)] font-bold">Каталог</h1>
          <p className="max-w-[640px] text-[0.95rem] text-muted">
            Всичко, което може да влезе в украсата ви. Изберете каквото ви
            харесва и го добавете към офертата — цената остава ориентировъчна до
            личната среща.
          </p>
        </div>
        <div ref={pillRef}>
          <OfferButton
            onClick={() => openBasket(null)}
            products={data.products}
          />
        </div>
      </div>

      {/* Mobile category pill row, sticky under the site header */}
      <div className="sticky top-14 z-30 -mx-5 mb-4 border-b border-border bg-bg/95 px-5 py-2.5 backdrop-blur lg:hidden">
        <div className="flex gap-2 overflow-x-auto">
          <PillButton
            active={state.cats.length === 0}
            onClick={() => setState((s) => ({ ...s, cats: [] }))}
          >
            Всички
          </PillButton>
          {data.categories.map((category) => (
            <PillButton
              key={category.slug}
              active={
                state.cats.length === 1 && state.cats[0] === category.slug
              }
              onClick={() => setState((s) => ({ ...s, cats: [category.slug] }))}
            >
              {category.name}
            </PillButton>
          ))}
        </div>
      </div>

      <div className="lg:flex lg:items-start lg:gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-[272px] shrink-0 self-start rounded-card border border-border bg-surface p-[22px] lg:sticky lg:top-6 lg:block">
          <div className="mb-4 flex items-center">
            <h2 className="flex-1 text-base font-semibold">Филтри</h2>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[0.82rem] font-extrabold text-cta hover:text-cta-strong focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
              >
                Изчисти
              </button>
            )}
          </div>
          <Filters
            data={data}
            state={state}
            onMode={setMode}
            onToggleCat={toggleCat}
            onToggleColor={toggleColor}
            onToggleBand={toggleBand}
          />
        </aside>

        {/* Results */}
        <div className="min-w-0 flex-1">
          {/* Desktop toolbar */}
          <div className="mb-4 hidden items-center gap-4 border-b border-border pb-4 lg:flex">
            <div className="text-sm text-muted">
              <strong className="text-base text-ink tabular-nums">
                {visible.length}
              </strong>{" "}
              {countWord}
            </div>
            <div className="flex-1" />
            <span className="text-sm text-muted">Подреди по</span>
            {sortSelect}
          </div>

          {/* Mobile toolbar */}
          <div className="mb-4 flex items-center gap-2.5 lg:hidden">
            <button
              ref={filterButtonRef}
              type="button"
              onClick={() => setSheetOpen(true)}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border border-balloon-pink bg-surface text-sm font-extrabold text-cta focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
            >
              Филтри
              {activeCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cta px-1.5 text-xs text-white tabular-nums">
                  {activeCount}
                </span>
              )}
            </button>
            <div className="flex-1">{sortSelect}</div>
          </div>

          {/* Active-filter chips */}
          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[0.8rem] text-muted">
              <span>Активни:</span>
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onRemove}
                  className="inline-flex items-center gap-2 rounded-full border border-balloon-pink bg-surface px-3 py-1.5 text-[0.8rem] font-extrabold text-cta-strong hover:bg-surface-2 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
                >
                  {chip.label}
                  <span aria-hidden>×</span>
                  <span className="sr-only">— премахни филтъра</span>
                </button>
              ))}
            </div>
          )}

          {visible.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-6">
                {shown.map((product, index) => (
                  <ProductCard
                    key={product.slug}
                    product={product}
                    priority={index < 3}
                    onAdd={openBasket}
                  />
                ))}
              </div>

              {visible.length > limit && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setLimit((l) => l + PAGE)}
                    className="min-h-[48px] rounded-full border border-balloon-pink bg-surface px-8 text-sm font-extrabold text-cta hover:bg-surface-2 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
                  >
                    Покажи още {visible.length - limit}
                  </button>
                </div>
              )}

              <p className="pt-6 text-[0.8rem] text-muted">
                Показани {shown.length} от {data.products.length} продукта ·
                цените са ориентировъчни, монтажът и транспортът се смятат по
                място и дата.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3.5 rounded-card border border-dashed border-border bg-surface px-10 py-16 text-center">
              <h3 className="text-xl font-semibold">
                Нищо не съвпада с този избор
              </h3>
              <p className="max-w-[420px] text-sm text-muted">
                Махнете някой филтър или ни пишете — част от нещата ги правим по
                поръчка и не са в каталога.
              </p>
              <div className="flex flex-wrap justify-center gap-2.5 pt-1.5">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="min-h-[44px] rounded-full bg-cta px-6 text-sm font-extrabold text-white hover:bg-cta-strong focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
                >
                  Изчисти филтрите
                </button>
                <Link
                  href="/about"
                  className="inline-flex min-h-[44px] items-center rounded-full border border-balloon-pink bg-surface px-6 text-sm font-extrabold text-cta hover:bg-surface-2 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
                >
                  Питайте за поръчка
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <FloatingOfferButton
        onClick={() => openBasket(null)}
        products={data.products}
        pillInView={pillInView}
      />

      <MiniBasket
        open={basketOpen}
        onClose={closeBasket}
        products={data.products}
        lastAdded={lastAdded}
        full={basketFull}
      />

      <FilterSheet
        open={sheetOpen}
        onClose={closeSheet}
        data={data}
        state={state}
        resultCount={visible.length}
        onMode={setMode}
        onToggleCat={toggleCat}
        onToggleColor={toggleColor}
        onToggleBand={toggleBand}
        onClear={clearFilters}
      />
    </div>
  );
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-[44px] shrink-0 rounded-full border px-4 text-[0.85rem] font-bold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta ${
        active
          ? "border-cta bg-cta text-white"
          : "border-border bg-surface text-ink"
      }`}
    >
      {children}
    </button>
  );
}
