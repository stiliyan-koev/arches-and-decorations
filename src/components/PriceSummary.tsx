import { useState } from "react";

export type SummaryLine = {
  key: string;
  name: string;
  value: string;
};

export type EventFields = {
  customerName: string;
  city: string;
  eventDate: string;
  eventTime: string;
  phone: string;
  setup2hBefore: boolean;
};

const FIELD_LABEL =
  "mb-1.5 block text-xs font-extrabold uppercase tracking-[0.06em] text-muted";
const FIELD_INPUT =
  "w-full rounded-[10px] border border-border-strong bg-surface px-[11px] py-2.5 text-[0.95rem] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink/50";

type Props = {
  lines: SummaryLine[];
  total: number;
  hasQuoteItems: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: (fields: EventFields) => void;
};

export default function PriceSummary({
  lines,
  total,
  hasQuoteItems,
  submitting,
  error,
  onSubmit,
}: Props) {
  const [fields, setFields] = useState<EventFields>({
    customerName: "",
    city: "Варна",
    eventDate: "",
    eventTime: "",
    phone: "",
    setup2hBefore: false,
  });

  function update<K extends keyof EventFields>(key: K, value: EventFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="lg:sticky lg:top-[88px]"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(fields);
      }}
    >
      <div className="rounded-card bg-gradient-to-br from-balloon-yellow to-balloon-orange p-[22px] text-ink shadow-card">
        <div className="text-[0.82rem] font-extrabold uppercase tracking-[0.08em] opacity-75">
          Ориентировъчна цена
        </div>
        <div className="my-1.5 font-display text-[2.5rem] leading-none font-bold tabular-nums">
          {total} лв
        </div>
        <div className="text-sm opacity-80">
          {lines.length === 0
            ? "Избери поне един артикул"
            : hasQuoteItems
              ? "Ориентировъчно, без артикулите по запитване"
              : "Ориентировъчно — коригирай селекцията вляво"}
        </div>

        <ul className="mt-4 text-[0.92rem]">
          {lines.length === 0 ? (
            <li className="py-3.5 text-center text-ink/60">
              Няма избрани артикули
            </li>
          ) : (
            lines.map((line) => (
              <li
                key={line.key}
                className="flex justify-between gap-2.5 border-b border-dashed border-ink/15 py-[7px] last:border-b-0"
              >
                <span>{line.name}</span>
                <span className="opacity-70">{line.value}</span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="mt-4 rounded-card border border-border bg-surface p-[22px] shadow-card">
        <h2 className="text-[1.02rem]">Данни за събитието</h2>
        <p className="mt-1 mb-4 text-sm text-muted">За да получиш крайна цена.</p>

        <div className="flex flex-wrap gap-3">
          <div className="min-w-[140px] flex-1">
            <label className={FIELD_LABEL} htmlFor="customer-name">
              Име
            </label>
            <input
              id="customer-name"
              type="text"
              className={FIELD_INPUT}
              value={fields.customerName}
              onChange={(event) => update("customerName", event.target.value)}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <label className={FIELD_LABEL} htmlFor="city">
              Град
            </label>
            <input
              id="city"
              type="text"
              className={FIELD_INPUT}
              value={fields.city}
              onChange={(event) => update("city", event.target.value)}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
          <div className="min-w-[140px] flex-1">
            <label className={FIELD_LABEL} htmlFor="event-date">
              Дата
            </label>
            <input
              id="event-date"
              type="date"
              required
              className={FIELD_INPUT}
              value={fields.eventDate}
              onChange={(event) => update("eventDate", event.target.value)}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <label className={FIELD_LABEL} htmlFor="event-time">
              Час
            </label>
            <input
              id="event-time"
              type="time"
              className={FIELD_INPUT}
              value={fields.eventTime}
              onChange={(event) => update("eventTime", event.target.value)}
            />
          </div>
        </div>

        <div className="mt-3">
          <label className={FIELD_LABEL} htmlFor="phone">
            Телефон
          </label>
          <input
            id="phone"
            type="tel"
            required
            placeholder="0888 ..."
            className={FIELD_INPUT}
            value={fields.phone}
            onChange={(event) => update("phone", event.target.value)}
          />
        </div>

        <label className="mt-3.5 flex items-start gap-2.5 text-[0.92rem] font-bold">
          <input
            type="checkbox"
            checked={fields.setup2hBefore}
            onChange={(event) => update("setup2hBefore", event.target.checked)}
            className="relative mt-0.5 h-5 w-5 flex-none cursor-pointer appearance-none rounded-md border-2 border-border-strong checked:border-balloon-blue checked:bg-balloon-blue checked:after:absolute checked:after:left-[5px] checked:after:top-[1px] checked:after:h-[11px] checked:after:w-[6px] checked:after:rotate-[42deg] checked:after:border-b-[2.5px] checked:after:border-r-[2.5px] checked:after:border-ink checked:after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/50"
          />
          Може ли 2 часа преди събитието да дойдем за монтаж?
        </label>

        {error && (
          <p className="mt-3.5 rounded-[10px] border border-cta/30 bg-cta/5 px-3 py-2.5 text-sm font-bold text-cta-strong">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-[18px] w-full cursor-pointer rounded-full bg-cta px-4 py-[15px] text-[1.05rem] font-extrabold text-white shadow-sm transition-colors hover:bg-cta-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Изпращане…" : "Изпрати запитване"}
        </button>

        <p className="mt-3 text-center text-xs leading-relaxed text-muted">
          Показаната цена е <strong>ориентировъчна</strong>. Крайната сума
          уточняваме на лична среща според избора и датата.
        </p>
      </div>
    </form>
  );
}
