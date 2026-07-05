'use client';

import { useState, useRef, useEffect } from 'react';

type DateFieldComposerProps = {
  value?: string;
  onChange: (value: string) => void;
  onClose?: () => void;
};

export function DateFieldComposer({ value = '', onChange, onClose }: DateFieldComposerProps) {
  const [typed, setTyped] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function formatDateInput(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    const dd = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const yy = digits.slice(4, 6);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return dd;
    if (digits.length <= 4) return `${dd}/${mm}`;
    return `${dd}/${mm}/${yy}`;
  }

  function handleTypedChange(raw: string) {
    const formatted = formatDateInput(raw);
    setTyped(formatted);
    setError(null);
  }

  function handleTypedBlur() {
    const digits = typed.replace(/\D/g, '');
    if (digits.length === 6) {
      const dd = digits.slice(0, 2);
      const mm = digits.slice(2, 4);
      const yy = digits.slice(4, 6);
      const date = new Date(2000 + Number(yy), Number(mm) - 1, Number(dd));
      if (
        date.getDate() === Number(dd) &&
        date.getMonth() === Number(mm) - 1 &&
        date.getFullYear() === 2000 + Number(yy)
      ) {
        const iso = `20${yy}-${mm}-${dd}`;
        onChange(iso);
        setTyped(iso);
        onClose?.();
        return;
      }
    }
    if (typed.length === 10) {
      setError('Invalid date');
    }
  }

  function handleCalendarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const iso = e.target.value;
    setTyped(iso);
    onChange(iso);
    onClose?.();
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-3 shadow-[var(--shadow-card)]">
      <input
        ref={inputRef}
        type="text"
        value={typed}
        onChange={(e) => handleTypedChange(e.target.value)}
        onBlur={handleTypedBlur}
        placeholder="dd/mm/yy"
        maxLength={10}
        className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
      />
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      <label className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm">
        <input type="date" onChange={handleCalendarChange} className="text-sm" />
        <span className="text-[var(--color-text-secondary)]">Pick from calendar</span>
      </label>
    </div>
  );
}