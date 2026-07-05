'use client';

import { Document, Page, pdfjs } from 'react-pdf';
import {
  FIELD_TYPE_LABELS,
  type TemplateField,
} from '@/lib/templates/types';
import type { CapturedSignature } from '@/lib/envelopes/signatures';
import { DateFieldComposer } from '@/components/signing/DateFieldComposer';
import { TextFieldComposer } from '@/components/signing/TextFieldComposer';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const PAGE_WIDTH = 720;

type SignerDocumentWithFieldsProps = {
  pdfUrl: string;
  pageCount: number;
  fields: TemplateField[];
  signatures: Record<string, CapturedSignature>;
  canInteract: boolean;
  onFieldClick: (field: TemplateField) => void;
  onFieldContextMenu?: (field: TemplateField, signature: CapturedSignature) => void;
  onDateChange?: (fieldId: string, value: string) => void;
  onTextChange?: (fieldId: string, value: string) => void;
  onCheckboxToggle?: (fieldId: string, checked: boolean) => void;
  fieldErrors?: Record<string, boolean>;
};

export function SignerDocumentWithFields({
  pdfUrl,
  pageCount,
  fields,
  signatures,
  canInteract,
  onFieldClick,
  onFieldContextMenu,
  onDateChange,
  onTextChange,
  onCheckboxToggle,
  fieldErrors = {},
}: SignerDocumentWithFieldsProps) {
  return (
    <Document
      file={pdfUrl}
      loading={<p className="p-4 text-sm text-[var(--color-text-secondary)]">Loading document…</p>}
      error={<p className="p-4 text-sm text-[var(--color-danger)]">Could not load this PDF.</p>}
    >
      {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
        <div
          key={pageNumber}
          className="relative mb-6 inline-block rounded-[var(--radius-sm)] shadow-[var(--shadow-card)]"
        >
          <Page
            pageNumber={pageNumber}
            width={PAGE_WIDTH}
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />
          {fields
            .filter((field) => field.page === pageNumber)
            .map((field) => {
              const captured = signatures[field.id];
              const isSignable =
                canInteract &&
                (field.field_type === 'signature' || field.field_type === 'initials');
              const autoValue =
                field.field_type === 'date'
                  ? new Date().toLocaleDateString('en-US')
                  : field.field_type === 'checkbox'
                    ? '✓'
                    : null;

              const hasError = Boolean(fieldErrors[field.id]);

              const handleClick = () => {
                if (field.field_type === 'date' && !captured && canInteract) {
                  return;
                }
                if (isSignable) {
                  onFieldClick(field);
                }
              };

              const handleContextMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                if (captured && onFieldContextMenu) {
                  onFieldContextMenu(field, captured);
                }
              };

              const dateValue = captured?.image_data ?? '';
              const textValue = captured?.image_data ?? '';

              const dateEditor =
                field.field_type === 'date' && canInteract && !captured ? (
                  <div className="absolute inset-0 z-10">
                    <DateFieldComposer
                      value={dateValue}
                      onChange={(iso) => {
                        onDateChange?.(field.id, iso);
                      }}
                      onClose={() => {}}
                    />
                  </div>
                ) : null;

              const textEditor =
                field.field_type === 'text' && canInteract && !captured ? (
                  <div className="absolute inset-0 z-10">
                    <TextFieldComposer
                      value={textValue}
                      onChange={(val) => {
                        onTextChange?.(field.id, val);
                      }}
                      onClose={() => {}}
                    />
                  </div>
                ) : null;

              const checkboxEditor =
                field.field_type === 'checkbox' && canInteract ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCheckboxToggle?.(field.id, !captured);
                      }}
                      className={`flex h-6 w-6 items-center justify-center rounded border-2 text-sm transition ${
                        captured
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-[var(--color-primary)] bg-white text-transparent'
                      }`}
                    >
                      ✓
                    </button>
                  </div>
                ) : null;

              return (
                <button
                  key={field.id}
                  type="button"
                  disabled={!isSignable && field.field_type !== 'date' && field.field_type !== 'text' && field.field_type !== 'checkbox'}
                  onClick={handleClick}
                  onContextMenu={handleContextMenu}
                  style={{
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    width: `${field.width}%`,
                    height: `${field.height}%`,
                  }}
                  className={`absolute overflow-hidden rounded-[var(--radius-sm)] border-2 px-1 text-[10px] font-medium transition ${
                    hasError
                      ? 'border-red-500 bg-red-50'
                      : captured
                        ? 'border-emerald-400 bg-white/90'
                        : isSignable
                          ? 'cursor-pointer border-[var(--color-primary)] bg-indigo-50/80 text-[var(--color-primary-hover)] hover:bg-indigo-100/90'
                          : 'border-[var(--color-border)] bg-white/70 text-[var(--color-text-secondary)]'
                  }`}
                >
                  {captured ? (
                    field.field_type === 'checkbox' ? (
                      <span className="flex items-center justify-center text-emerald-600">✓</span>
                    ) : field.field_type === 'date' || field.field_type === 'text' ? (
                      <span className="flex h-full items-center justify-center truncate px-1 text-center text-[10px] text-[var(--color-text-primary)]">
                        {captured.image_data}
                      </span>
                    ) : (
                      <img
                        src={captured.image_data}
                        alt={FIELD_TYPE_LABELS[field.field_type]}
                        className="h-full w-full object-contain"
                      />
                    )
                  ) : autoValue ? (
                    <span className="flex h-full items-center justify-center text-xs text-[var(--color-text-primary)]">
                      {autoValue}
                    </span>
                  ) : isSignable ? (
                    <span className="flex h-full items-center justify-center truncate">
                      Click to {FIELD_TYPE_LABELS[field.field_type].toLowerCase()}
                    </span>
                  ) : (
                    <span className="flex h-full items-center justify-center truncate opacity-70">
                      {FIELD_TYPE_LABELS[field.field_type]}
                    </span>
                  )}
                  {dateEditor}
                  {textEditor}
                  {checkboxEditor}
                </button>
              );
            })}
        </div>
      ))}
    </Document>
  );
}