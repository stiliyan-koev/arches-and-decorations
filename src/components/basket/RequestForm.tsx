"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import Link from "next/link";
import BasketLines from "@/components/basket/BasketLines";
import LabourLabel from "@/components/basket/LabourLabel";
import EventDetails, {
  type EventFields,
} from "@/components/configurator/EventDetails";
import ContactForm, {
  type ContactFields,
} from "@/components/configurator/ContactForm";
import SummaryRail, {
  type SummaryLine,
} from "@/components/configurator/SummaryRail";
import MobileSummaryBar from "@/components/configurator/MobileSummaryBar";
import {
  getRequestAvailability,
  submitRequest,
  type RequestItem,
} from "@/app/actions";
import { formatDate, formatPrice, QUOTE_LABEL, TRANSPORT_NOTE } from "@/lib/format";
import CoverWarning from "@/components/basket/CoverWarning";
import { selection, useBasket } from "@/lib/selection";
import {
  basketView,
  coverShortfall,
  hasLabour,
  type PlpProduct,
} from "@/lib/catalog-plp";

// „Само под наем“ is "rental" here, not the catalog's "rent": /request/page.tsx
// translates between the two. Named apart so `mode` is never ambiguous.
type RequestMode = "service" | "rental";

// The order summary behind the mini-basket's „Продължи“. Same job as the
// configurator's two steps, on one page: the basket (still editable), when and
// where, how to reach the customer, then submitRequest(). No payment — it's a
// request she confirms in person. It starts in the mode picked on the catalog,
// and „Украса с монтаж“ adds „Труд за украса“ once.
export default function RequestForm({
  products,
  labourPrice,
  initialMode,
}: {
  products: PlpProduct[];
  labourPrice: number;
  initialMode: RequestMode;
}) {
  const lines = useBasket();
  // The basket lives in localStorage, so the server always renders it empty.
  // Wait for the browser before deciding the basket is empty, or every visit
  // would flash „Офертата е празна“ first.
  const inBrowser = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const { items, total, hasQuote } = basketView(lines, products);

  const [mode, setMode] = useState<RequestMode>(initialMode);
  const [event, setEvent] = useState<EventFields>({
    city: "Варна",
    date: "",
    time: "",
    setup2hBefore: true,
    startDate: "",
    endDate: "",
  });
  const [contact, setContact] = useState<ContactFields>({
    customerName: "",
    phone: "",
    note: "",
  });
  // What confirmed bookings already hold on the chosen dates: per product, and
  // per colour for products with colours (each colour has its own stock).
  const [availability, setAvailability] = useState<{
    key: string;
    byProduct: Record<string, number>;
    byColor: Record<string, number>;
  }>({ key: "", byProduct: {}, byColor: {} });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{
    total: number;
    hasQuote: boolean;
    labour: number;
  } | null>(null);

  // „Само под наем“ only makes sense when everything in the basket can be loaned
  // out on its own, and „Украса с монтаж“ when she may set all of it up. A
  // basket that can do only one of them gets that one; one that can do neither
  // (a rent-only item next to a setup-only one) can't be sent as it is.
  const notRentable = items.filter((item) => !item.product.rentable);
  const notSetUp = items.filter((item) => !item.product.setupPossible);
  const canRent = items.length > 0 && notRentable.length === 0;
  const canService = notSetUp.length === 0;
  const noMode = items.length > 0 && !canRent && !canService;
  // Once per product, even when it's in the basket in two colours.
  const notRentableNames = namesOf(notRentable);
  const notSetUpNames = namesOf(notSetUp);
  // A basket that can rent goes as a rental when it can't be set up, or when
  // the visitor picked „Само под наем“. Everything else goes as a service.
  let activeMode: RequestMode = "service";
  if (canRent && (!canService || mode === "rental")) activeMode = "rental";
  // Forget a rental choice once the basket can't rent, so it doesn't come back
  // on its own when the basket qualifies again. Guarded, so it runs once. Only
  // in the browser: the server/hydration render sees an empty basket, which
  // would throw away a ?mode=rent from the catalog.
  if (inBrowser && !canRent && mode === "rental") setMode("service");
  // The label shows exactly when the request goes as „Украса с монтаж“.
  const labour =
    labourPrice > 0 && hasLabour(items, activeMode === "service") ? labourPrice : 0;
  const grandTotal = total + labour;

  // The dates the request occupies: one day for a service, pickup→return for a
  // rental. Empty until they're filled in (and the return isn't before pickup).
  const from = activeMode === "rental" ? event.startDate : event.date;
  const to = activeMode === "rental" ? event.endDate : event.date;
  const datesReady = Boolean(from && to && to >= from);
  const returnBeforePickup = Boolean(from && to && to < from);
  const rangeKey = datesReady ? `${from}:${to}` : "";
  const fresh = availability.key === rangeKey;
  const reservedByProduct = fresh ? availability.byProduct : {};
  const reservedByColor = fresh ? availability.byColor : {};
  const checking = datesReady && !fresh;

  useEffect(() => {
    if (!rangeKey) return;
    let cancelled = false;

    getRequestAvailability(from, to)
      .then(({ byProduct, byColor }) => {
        if (!cancelled) setAvailability({ key: rangeKey, byProduct, byColor });
      })
      .catch(() => {
        // An unreachable database reads as "nothing booked" — she confirms every
        // request by hand anyway, so a stale count annoys at worst.
        if (!cancelled) setAvailability({ key: rangeKey, byProduct: {}, byColor: {} });
      });

    return () => {
      cancelled = true;
    };
  }, [rangeKey, from, to]);

  // A warning, not a block: a line asking for more than is free on those dates.
  // A line in a colour is checked twice: against that colour's own stock, and,
  // with the product's other lines, against the whole product — bookings saved
  // without a colour (all from before colours) hold pieces of the product too.
  const notes: Record<string, string> = {};
  if (datesReady && !checking) {
    const askedByProduct = new Map<string, number>();
    for (const { product, qty } of items) {
      askedByProduct.set(product.id, (askedByProduct.get(product.id) ?? 0) + qty);
    }

    for (const { key, product, swatch, qty } of items) {
      if (product.stock === null) continue; // a consumable never runs out

      if (swatch && swatch.stock !== null) {
        const colorFree = Math.max(0, swatch.stock - (reservedByColor[swatch.id] ?? 0));
        if (qty > colorFree) {
          notes[key] =
            colorFree === 0
              ? "Заето за тези дати — ще потърсим заместител."
              : `Само ${colorFree} бр. свободни в този цвят за тези дати.`;
          continue;
        }
      }

      const free = Math.max(0, product.stock - (reservedByProduct[product.id] ?? 0));
      if ((askedByProduct.get(product.id) ?? 0) > free) {
        notes[key] =
          free === 0
            ? "Заето за тези дати — ще потърсим заместител."
            : swatch
              ? `Само ${free} бр. свободни за тези дати, всички цветове заедно.`
              : `Само ${free} бр. свободни за тези дати.`;
      }
    }
  }

  const summaryLines: SummaryLine[] = items.map(
    ({ key, product, swatch, qty, lineTotal }) => ({
      key,
      name: product.name,
      sub: [swatch?.name, qty > 1 ? `${qty} бр.` : ""].filter(Boolean).join(" · "),
      value: lineTotal === null ? QUOTE_LABEL : formatPrice(lineTotal),
    }),
  );
  if (labour > 0) {
    summaryLines.push({
      key: "labour",
      name: "Труд за украса",
      sub: "",
      value: formatPrice(labour),
    });
  }

  const hint =
    items.length === 0
      ? "Офертата е празна."
      : noMode
        ? "Артикулите само под наем и тези само с монтаж се изпращат поотделно."
        : returnBeforePickup
          ? "Връщането е преди вземането."
          : !datesReady
            ? activeMode === "rental"
              ? "Изберете дати за вземане и връщане."
              : "Изберете дата на събитието."
            : !contact.phone.trim()
              ? "Попълнете телефон, за да изпратим."
              : null;

  const ctaDisabled = submitting || hint !== null;
  const ctaLabel = submitting ? "Изпращане…" : "Изпрати запитване";

  async function send() {
    setError(null);

    const requestItems: RequestItem[] = items.map(
      ({ product, swatch, qty, lineTotal, requirements }) => ({
        productId: product.id,
        colorId: swatch?.id ?? null,
        qty,
        linePrice: lineTotal,
        // „Опишете вашите изисквания“ — saved to booking_items.custom_text.
        customText: requirements.trim() || null,
      }),
    );

    setSubmitting(true);
    try {
      const result = await submitRequest({
        mode: activeMode,
        customerName: contact.customerName,
        phone: contact.phone,
        city: event.city,
        note: contact.note,
        eventDate: activeMode === "service" ? event.date : "",
        eventTime: activeMode === "service" ? event.time : "",
        startDate: activeMode === "rental" ? event.startDate : "",
        endDate: activeMode === "rental" ? event.endDate : "",
        setup2hBefore: activeMode === "service" && event.setup2hBefore,
        estimatedTotal: grandTotal,
        labourPrice: labour > 0 ? labour : null,
        items: requestItems,
      });

      if (result.ok) {
        setSent({ total: grandTotal, hasQuote, labour });
        selection.clear();
      } else {
        setError(result.error);
      }
    } catch {
      // The action itself failed (network drop, server down), not the data.
      setError("Нещо се обърка при изпращането. Моля, опитайте отново.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (!ctaDisabled) void send();
  }

  if (sent !== null) {
    return (
      <div className="mx-auto max-w-xl rounded-card border border-border bg-surface p-8 text-center shadow-card">
        <p className="text-5xl">🎈</p>
        <h2 className="mt-4 font-serif text-2xl">
          Получихме Вашето запитване за украса!
        </h2>
        {/* With only „по запитване“ items the sum is 0, so it isn't named. */}
        <p className="mt-3 text-muted">
          {sent.total > 0 ? (
            <>
              {sent.labour > 0
                ? "Ориентировъчната сума, с труда за украса, е"
                : "Ориентировъчната сума на избраните артикули е"}{" "}
              <strong className="text-ink">{formatPrice(sent.total)}</strong>
              {sent.hasQuote && (
                <> (артикулите „по запитване“ се уточняват допълнително)</>
              )}
              .
            </>
          ) : (
            "Цените на избраните артикули ще уточним допълнително."
          )}
        </p>
        <p className="mt-3 text-muted">
          Ще се свържем с Вас по телефона за потвърждение на наличностите за
          Вашата дата и за уточняване на всички детайли.
        </p>
        <p className="mt-4 text-sm text-muted">
          <strong className="text-ink">Забележка:</strong> Посочените цени са за
          наем на артикулите
          {sent.labour > 0
            ? ", а трудът за украса е включен в сумата."
            : " и не включват труд за монтаж/демонтаж."}{" "}
          Доставката е безплатна за гр. Варна, а за останалите населени места се
          изчислява спрямо разстоянието.
        </p>
        <Link
          href="/catalog"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-full border border-balloon-pink bg-surface px-6 text-sm font-extrabold text-cta hover:bg-surface-2"
        >
          Обратно към каталога
        </Link>
      </div>
    );
  }

  if (!inBrowser) return <div className="min-h-[50vh]" />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3.5 rounded-card border border-dashed border-border bg-surface px-10 py-16 text-center">
        <h2 className="text-xl font-semibold">Офертата е празна</h2>
        <p className="max-w-[420px] text-sm text-muted">
          Добавете от каталога каквото ви харесва и се върнете тук, за да
          изпратите запитване.
        </p>
        <Link
          href="/catalog"
          className="inline-flex min-h-[44px] items-center rounded-full bg-cta px-6 text-sm font-extrabold text-white hover:bg-cta-strong focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
        >
          Към каталога
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid rounded-card border border-border bg-surface shadow-card lg:grid-cols-[1.9fr_1fr]"
    >
      {/* min-w-0 keeps the grid column from being widened by its content. */}
      <div className="min-w-0 p-[22px]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[1.05rem] font-extrabold">Избрани продукти</h2>
          <Link
            href={activeMode === "rental" ? "/catalog?mode=rent" : "/catalog"}
            className="text-sm font-extrabold text-cta hover:text-cta-strong"
          >
            + Добави още
          </Link>
        </div>
        <CoverWarning shortfall={coverShortfall(items)} />
        <BasketLines items={items} notes={notes} />
        {labour > 0 && <LabourLabel price={labour} />}

        <fieldset className="mt-6">
          <legend className="mb-2 text-[1.05rem] font-extrabold">
            Как да е?
          </legend>
          <div className="flex flex-wrap gap-2">
            <ModeButton
              active={!noMode && activeMode === "service"}
              disabled={!canService}
              onClick={() => setMode("service")}
            >
              Украса с монтаж от нас
            </ModeButton>
            <ModeButton
              active={activeMode === "rental"}
              disabled={!canRent}
              onClick={() => setMode("rental")}
            >
              Под наем
            </ModeButton>
          </div>
          {noMode ? (
            <p className="mt-2 text-[0.8rem] font-bold text-rose-ink">
              {quoted(notSetUpNames)}{" "}
              {notSetUpNames.length === 1 ? "се предлага" : "се предлагат"} само
              под наем, а {quoted(notRentableNames)} само с монтаж. Изпратете ги в
              отделни запитвания.
            </p>
          ) : !canRent ? (
            <p className="mt-2 text-[0.8rem] text-muted">
              Под наем не може, защото {quoted(notRentableNames)}{" "}
              {notRentableNames.length === 1 ? "се предлага" : "се предлагат"} само
              с монтаж.
            </p>
          ) : !canService ? (
            <p className="mt-2 text-[0.8rem] text-muted">
              С монтаж не може, защото {quoted(notSetUpNames)}{" "}
              {notSetUpNames.length === 1 ? "се предлага" : "се предлагат"} само
              под наем.
            </p>
          ) : null}
        </fieldset>

        <EventDetails
          mode={activeMode}
          fields={event}
          onChange={(patch) => setEvent((current) => ({ ...current, ...patch }))}
          checking={checking}
        />

        <section className="mt-6">
          <h2 className="mb-3 text-[1.05rem] font-extrabold">
            Как да се свържем с вас?
          </h2>
          {datesReady && (
            <p className="mb-4 rounded-item bg-rail px-3.5 py-2.5 text-sm text-muted">
              {activeMode === "rental"
                ? `Под наем: ${formatDate(from)} → ${formatDate(to)}`
                : `Дата: ${formatDate(from)}${event.time ? ` в ${event.time} ч.` : ""}`}{" "}
              · {event.city}
            </p>
          )}
          <ContactForm
            fields={contact}
            onChange={(patch) =>
              setContact((current) => ({ ...current, ...patch }))
            }
          />
        </section>
      </div>

      <div className="min-w-0 rounded-b-card border-t border-border bg-rail p-[22px] pb-28 lg:rounded-tr-card lg:rounded-b-none lg:border-t-0 lg:border-l lg:pb-[22px]">
        <SummaryRail
          lines={summaryLines}
          total={grandTotal}
          hasQuoteItems={hasQuote}
          priceNote={labour > 0 ? TRANSPORT_NOTE : undefined}
          ctaLabel={ctaLabel}
          ctaDisabled={ctaDisabled}
          hint={hint}
          error={error}
        />
      </div>

      <MobileSummaryBar
        itemCount={items.reduce((sum, item) => sum + item.qty, 0)}
        total={grandTotal}
        hasQuoteItems={hasQuote}
        ctaLabel={submitting ? "Изпращане…" : "Изпрати"}
        ctaDisabled={ctaDisabled}
        hint={hint}
      />
    </form>
  );
}

function namesOf(items: { product: { name: string } }[]) {
  return [...new Set(items.map((item) => item.product.name))];
}

function quoted(names: string[]) {
  return names.map((name) => `„${name}“`).join(", ");
}

function noSubscribe() {
  return () => {};
}

function ModeButton({
  active,
  disabled = false,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-[44px] rounded-full border px-5 text-[0.88rem] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta ${
        active
          ? "border-cta bg-cta text-white"
          : "border-border-strong bg-surface text-ink"
      }`}
    >
      {children}
    </button>
  );
}
