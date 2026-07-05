'use client';

import { useState } from 'react';

type TextFieldComposerProps = {
  value?: string;
  onChange: (value: string) => void;
  onClose?: () => void;
};

export function TextFieldComposer({ value = '', onChange, onClose }: TextFieldComposerProps) {
  const [text, setText] = useState(value);
  const MAX_LENGTH = 200;

  function handleBlur() {
    onChange(text.trim());
    onClose?.();
  }

  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-3 shadow-[var(--shadow-card)]">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        autoFocus
        maxLength={MAX_LENGTH}
        placeholder="Type here..."
        className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
      />
      <p className="text-right text-xs text-[var(--color-text-secondary)]">
        {text.length}/{MAX_LENGTH}
      </p>
    </div>
  );
}