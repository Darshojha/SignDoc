'use client';

import type { TemplateField } from '@/lib/templates/types';

type PageManagementProps = {
  pageCount: number;
  currentPage: number;
  onSelectPage: (page: number) => void;
};

export function PageManagement({ pageCount, currentPage, onSelectPage }: PageManagementProps) {
  if (pageCount <= 1) return null;

  return (
    <div className="flex w-48 flex-col gap-2">
      <h3 className="text-xs font-semibold text-[var(--color-text-secondary)]">Pages</h3>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onSelectPage(pageNumber)}
            className={`rounded-[var(--radius-sm)] border px-2 py-1 text-xs ${
              pageNumber === currentPage
                ? 'border-[var(--color-primary)] bg-[var(--surface-raised-hover)] text-[var(--color-primary-hover)]'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--surface-raised-hover)]'
            }`}
          >
            Page {pageNumber}
          </button>
        ))}
      </div>
    </div>
  );
}