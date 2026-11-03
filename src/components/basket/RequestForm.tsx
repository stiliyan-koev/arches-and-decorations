"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import Link from "next/link";
import BasketLines from "@/components/basket/BasketLines";
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
import { trackContact } from "@/lib/tracking";
import {
  getRequestAvailability,
  submitRequest,
  type RequestItem,
} from "@/app/actions";
import { formatDate, formatPrice, QUOTE_LABEL } from "@/lib/format";
import { selection, useBasket } from "@/lib/selection";
import { basketView, type PlpProduct } from "@/lib/catalog-plp";

type Mode = "service" | "rental";

// The order summary behind the mini-basket's „Продължи“. Same job as the
// configurator's two steps, on one page: the basket (still editable), when and
// where, how to reach the customer, then submitRequest(). No payment — it's a
// request she confirms in person.
export default function RequestForm({ products }: { products: PlpProduct[] }) {
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

  const [mode, setMode] = useState<Mode>("service");
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
  const [sent, setSent] = useState<{ total: number; hasQuote: boolean } | null>(
    null,
  );

  // „Само под наем“ only makes sense when everything in the basket can be loaned
  // out on its own. A basket that stops qualifying falls back to service.
  const notRentable = items.filter((item) => !item.product.rentable);
  const canRent = items.length > 0 && notRentable.length === 0;
  // Once per product, even when it's in the basket in two colours.
  const notRentableNames = [...new Set(notRentable.map((item) => item.product.name))];
  const activeMode: Mode = canRent ? mode : "service";
  // Forget a rental choice once the basket can't rent, so it doesn't come back
  // on its own when the basket qualifies again. Guarded, so it runs once.
  if (!canRent && mode === "rental") setMode("service");

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

  const hint =
    items.length === 0
      ? "Офертата е празна."
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
      ({ product, swatch, qty, lineTotal }) => ({
        productId: product.id,
        colorId: swatch?.id ?? null,
        qty,
        linePrice: lineTotal,
        customText: null,
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
        estimatedTotal: total,
        items: requestItems,
      });

      if (result.ok) {
        setSent({ total, hasQuote });
        selection.clear();
        trackContact("inquiry");
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
        <h2 className="mt-4 font-serif text-2xl">Благодарим!</h2>
        {/* With only „по запитване“ items the sum is 0, so it isn't named. */}
        <p className="mt-3 text-muted">
          Получихме вашето запитване
          {sent.total > 0 && (
            <>
              {" "}за <strong className="text-ink">{formatPrice(sent.total)}</strong>{" "}
              ориентировъчно
              {sent.hasQuote && <> плюс артикулите „по запитване“</>}
            </>
          )}
          . Ще се свържем с вас по телефона, за да уговорим лична среща.
        </p>
        <p className="mt-4 text-sm text-muted">
          Крайната сума и наличността за вашата дата уточняваме на срещата. Няма
          онлайн плащане и не се обвързвате с нищо.
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
            href="/catalog"
            className="text-sm font-extrabold text-cta hover:text-cta-strong"
          >
            + Добави още
          </Link>
        </div>
        <BasketLines items={items} notes={notes} />

        <fieldset className="mt-6">
          <legend className="mb-2 text-[1.05rem] font-extrabold">
            Как да е?
          </legend>
          <div className="flex flex-wrap gap-2">
            <ModeButton
              active={activeMode === "service"}
              onClick={() => setMode("service")}
            >
              Украса с монтаж
            </ModeButton>
            <ModeButton
              active={activeMode === "rental"}
              disabled={!canRent}
              onClick={() => setMode("rental")}
            >
              Само под наем
            </ModeButton>
          </div>
          {!canRent && (
            <p className="mt-2 text-[0.8rem] text-muted">
              Само под наем не може, защото{" "}
              {notRentableNames.map((name) => `„${name}“`).join(", ")}{" "}
              {notRentableNames.length === 1 ? "се предлага" : "се предлагат"} само
              с монтаж.
            </p>
          )}
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
          total={total}
          hasQuoteItems={hasQuote}
          ctaLabel={ctaLabel}
          ctaDisabled={ctaDisabled}
          hint={hint}
          error={error}
        />
      </div>

      <MobileSummaryBar
        itemCount={items.reduce((sum, item) => sum + item.qty, 0)}
        total={total}
        hasQuoteItems={hasQuote}
        ctaLabel={submitting ? "Изпращане…" : "Изпрати"}
        ctaDisabled={ctaDisabled}
        hint={hint}
      />
    </form>
  );
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
