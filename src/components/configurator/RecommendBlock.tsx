import OptionDropdown, {
  type DropdownOption,
} from "@/components/configurator/OptionDropdown";

type Props = {
  title: string;
  hint: string;
  label: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
};

// The add-on offer inside the modal, shown when a category has a
// recommend_category_id (arches -> covers). Rose-tinted so it reads as a
// suggestion, not a required step. The options are the target category's
// products and their colours.
export default function RecommendBlock({
  title,
  hint,
  label,
  options,
  value,
  onChange,
}: Props) {
  return (
    <div className="rounded-item border border-rose bg-rose/5 p-3.5">
      <p className="mb-2.5 text-[0.85rem] font-bold">
        {title}
        <span className="mt-0.5 block text-[0.8rem] font-normal text-muted">
          {hint}
        </span>
      </p>
      <OptionDropdown
        label={label}
        value={value}
        placeholder={`Без ${label.toLowerCase()}`}
        options={options}
        onChange={onChange}
      />
    </div>
  );
}
