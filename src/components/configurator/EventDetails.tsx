export type EventFields = {
  city: string;
  date: string; // yyyy-mm-dd — service: the event day
  time: string; // hh:mm
  setup2hBefore: boolean;
  startDate: string; // yyyy-mm-dd — rental: pickup
  endDate: string; // yyyy-mm-dd — rental: return
};

type Props = {
  fields: EventFields;
  onChange: (patch: Partial<EventFields>) => void;
  checking: boolean; // availability is being re-fetched for the chosen date
  // "service" (default): event date, time and the setup question.
  // "rental": pickup and return dates instead — nobody comes to set up.
  mode?: "service" | "rental";
};

const LABEL =
  "mb-1.5 block text-[0.72rem] font-extrabold tracking-[0.06em] text-muted uppercase";
const INPUT =
  "w-full rounded-[9px] border border-border-strong bg-surface px-[11px] py-2.5 text-[0.93rem] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-rose-ink";

// Today's date in Bulgaria as yyyy-mm-dd. toISOString() gives the UTC date,
// which is still yesterday here until 02:00/03:00. The time zone is pinned
// rather than taken from the machine, so the server render (UTC on Netlify) and
// the browser agree during hydration.
function todayInBulgaria() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

// „Данни за събитието" — under the families. Changing the date is what drives
// availability everywhere, so the parent re-checks stock whenever it moves.
export default function EventDetails({
  fields,
  onChange,
  checking,
  mode = "service",
}: Props) {
  const today = todayInBulgaria();

  return (
    <section className="mt-6 rounded-item border border-border bg-bg p-[18px]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[1.05rem] font-extrabold">Данни за събитието</h3>
        {checking && (
          <span className="text-xs font-bold text-muted">
            Проверяваме наличността…
          </span>
        )}
      </div>
      <p className="mt-0.5 mb-3.5 text-[0.85rem] text-muted">
        Нужни са ни, за да проверим наличността и да изчислим транспорта.
      </p>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[150px] flex-1">
          <label className={LABEL} htmlFor="event-city">
            Град / населено място
          </label>
          <input
            id="event-city"
            type="text"
            autoComplete="address-level2"
            className={INPUT}
            value={fields.city}
            onChange={(event) => onChange({ city: event.target.value })}
          />
        </div>
        {mode === "rental" ? (
          <>
            <div className="min-w-[150px] flex-1">
              <label className={LABEL} htmlFor="event-start">
                Вземане
              </label>
              <input
                id="event-start"
                type="date"
                min={today}
                className={INPUT}
                value={fields.startDate}
                onChange={(event) => onChange({ startDate: event.target.value })}
              />
            </div>
            <div className="min-w-[150px] flex-1">
              <label className={LABEL} htmlFor="event-end">
                Връщане
              </label>
              <input
                id="event-end"
                type="date"
                min={fields.startDate || today}
                className={INPUT}
                value={fields.endDate}
                onChange={(event) => onChange({ endDate: event.target.value })}
              />
            </div>
          </>
        ) : (
          <>
            <div className="min-w-[150px] flex-1">
              <label className={LABEL} htmlFor="event-date">
                Дата на събитието
              </label>
              <input
                id="event-date"
                type="date"
                min={today}
                className={INPUT}
                value={fields.date}
                onChange={(event) => onChange({ date: event.target.value })}
              />
            </div>
            <div className="min-w-[150px] flex-1">
              <label className={LABEL} htmlFor="event-time">
                Час
              </label>
              <input
                id="event-time"
                type="time"
                className={INPUT}
                value={fields.time}
                onChange={(event) => onChange({ time: event.target.value })}
              />
            </div>
          </>
        )}
      </div>

      {mode === "service" && (
        <label
          className="mt-3.5 flex cursor-pointer items-start gap-2.5 text-[0.89rem] font-bold"
          htmlFor="event-setup"
        >
          <input
            id="event-setup"
            type="checkbox"
            checked={fields.setup2hBefore}
            onChange={(event) => onChange({ setup2hBefore: event.target.checked })}
            className="relative mt-0.5 h-5 w-5 flex-none cursor-pointer appearance-none rounded-md border-2 border-border-strong bg-surface checked:border-rose checked:bg-rose checked:after:absolute checked:after:top-[1px] checked:after:left-[5px] checked:after:h-[11px] checked:after:w-[6px] checked:after:rotate-[42deg] checked:after:border-r-[2.5px] checked:after:border-b-[2.5px] checked:after:border-white checked:after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-ink"
          />
          <span>
            Може ли 2 часа преди събитието да дойдем за монтажа?
            <small className="mt-0.5 block text-[0.79rem] font-normal text-muted">
              Ако не е възможно, ще потърсим друг час заедно с вас.
            </small>
          </span>
        </label>
      )}
    </section>
  );
}
