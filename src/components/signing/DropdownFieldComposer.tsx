// ponytail: dropdown fulfillment on signer side - open <select> overlay over the field
'use client';

type DropdownFieldComposerProps = {
  options: string[];
  value?: string;
  onChange: (value: string) => void;
  onClose?: () => void;
};

export function DropdownFieldComposer({
  options,
  value = '',
  onChange,
  onClose,
}: DropdownFieldComposerProps) {
  const choices = options.length > 0 ? options : ['(no options set)'];

  return (
    <select
      autoFocus
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        onClose?.();
      }}
      onBlur={() => onClose?.()}
      className="h-full w-full rounded-[var(--radius-sm)] border border-[var(--color-primary)] bg-white px-1 text-[10px] text-[var(--color-text-primary)] outline-none"
    >
      <option value="">Select…</option>
      {choices.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}