export type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  label: string;
  value: string;
  placeholder: string;
  options: DropdownOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
};

// A labelled <select>. Every dropdown step in the modal — the option group, the
// product list, the recommended add-on — is one of these, driven by its data.
export default function OptionDropdown({
  label,
  value,
  placeholder,
  options,
  disabled = false,
  onChange,
}: Props) {
  return (
    <div>
      <label className="mb-1.5 block text-[0.72rem] font-extrabold tracking-[0.06em] text-muted uppercase">
        {label}
      </label>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[10px] border border-border-strong bg-surface px-[11px] py-2.5 text-[0.93rem] text-ink disabled:opacity-50 focus:outline-2 focus:outline-offset-2 focus:outline-rose-ink"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
