const FIELD_LABEL =
  "mb-1.5 block text-xs font-extrabold uppercase tracking-[0.06em] text-muted";
const FIELD_INPUT =
  "w-full rounded-[10px] border border-border-strong bg-surface px-[11px] py-2.5 text-[0.95rem] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-rose-ink";

export type ContactFields = {
  customerName: string;
  phone: string;
  note: string;
};

type Props = {
  fields: ContactFields;
  onChange: (patch: Partial<ContactFields>) => void;
};

// Step 2. City, date and the setup question live in „Данни за събитието" on step
// 1, so all that's left here is how to reach the customer.
export default function ContactForm({ fields, onChange }: Props) {
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[150px] flex-1">
          <label className={FIELD_LABEL} htmlFor="customer-name">
            Вашето име
          </label>
          <input
            id="customer-name"
            type="text"
            autoComplete="name"
            className={FIELD_INPUT}
            value={fields.customerName}
            onChange={(event) => onChange({ customerName: event.target.value })}
          />
        </div>
        <div className="min-w-[150px] flex-1">
          <label className={FIELD_LABEL} htmlFor="phone">
            Телефон
          </label>
          <input
            id="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="0888 ..."
            className={FIELD_INPUT}
            value={fields.phone}
            onChange={(event) => onChange({ phone: event.target.value })}
          />
        </div>
      </div>

      <div className="mt-3">
        <label className={FIELD_LABEL} htmlFor="note">
          Желани цветове, тема или допълнителни детайли
        </label>
        <textarea
          id="note"
          rows={3}
          maxLength={3000}
          placeholder="Разкажете ни за темата на празника…"
          className={FIELD_INPUT}
          value={fields.note}
          onChange={(event) => onChange({ note: event.target.value })}
        />
      </div>

      <p className="mt-3.5 text-xs leading-relaxed text-muted">
        Използваме името и контактите ви само за организацията на събитието.
        Всички часове са по българско време.
      </p>
    </>
  );
}
