/** Small shared form controls for the config surface. */

interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: NumberFieldProps) {
  return (
    <label class="ms-field">
      <span class="ms-field__label">{label}</span>
      <input
        class="ms-field__input ms-field__input--number"
        type="number"
        value={value}
        min={min}
        max={max}
        onInput={(e) => {
          const n = Number((e.target as HTMLInputElement).value);
          if (!Number.isNaN(n)) onChange(n);
        }}
      />
    </label>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function TextField({
  label,
  value,
  placeholder,
  onChange,
}: TextFieldProps) {
  return (
    <label class="ms-field">
      <span class="ms-field__label">{label}</span>
      <input
        class="ms-field__input"
        type="text"
        value={value}
        placeholder={placeholder}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
      />
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps) {
  return (
    <label class="ms-field">
      <span class="ms-field__label">{label}</span>
      <select
        class="ms-field__input dropdown"
        value={value}
        onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt} selected={opt === value}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
