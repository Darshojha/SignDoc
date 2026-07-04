"use client";

import { Document, Page, pdfjs } from "react-pdf";
import {
  FIELD_TYPE_LABELS,
  type TemplateField,
} from "@/lib/templates/types";
import type { CapturedSignature } from "@/lib/envelopes/signatures";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const PAGE_WIDTH = 720;

type SignerDocumentWithFieldsProps = {
  pdfUrl: string;
  pageCount: number;
  fields: TemplateField[];
  signatures: Record<string, CapturedSignature>;
  canInteract: boolean;
  onFieldClick: (field: TemplateField) => void;
};

export function SignerDocumentWithFields({
  pdfUrl,
  pageCount,
  fields,
  signatures,
  canInteract,
  onFieldClick,
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
                (field.field_type === "signature" || field.field_type === "initials");
              const autoValue =
                field.field_type === "date"
                  ? new Date().toLocaleDateString("en-US")
                  : field.field_type === "checkbox"
                    ? "✓"
                    : null;

              return (
                <button
                  key={field.id}
                  type="button"
                  disabled={!isSignable}
                  onClick={() => {
                    if (isSignable) {
                      onFieldClick(field);
                    }
                  }}
                  style={{
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    width: `${field.width}%`,
                    height: `${field.height}%`,
                  }}
                  className={`absolute overflow-hidden rounded-[var(--radius-sm)] border-2 px-1 text-[10px] font-medium transition ${
                    captured
                      ? "border-emerald-400 bg-white/90"
                      : isSignable
                        ? "cursor-pointer border-[var(--color-primary)] bg-indigo-50/80 text-[var(--color-primary-hover)] hover:bg-indigo-100/90"
                        : "border-[var(--color-border)] bg-white/70 text-[var(--color-text-secondary)]"
                  }`}
                >
                  {captured ? (
                    <img
                      src={captured.image_data}
                      alt={FIELD_TYPE_LABELS[field.field_type]}
                      className="h-full w-full object-contain"
                    />
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
                </button>
              );
            })}
        </div>
      ))}
    </Document>
  );
}
