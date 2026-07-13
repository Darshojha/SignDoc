"use client";

import { useCallback, useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  FIELD_TYPES,
  FIELD_TYPE_LABELS,
  type FieldType,
  type TemplateField,
} from "@/lib/templates/types";
import { FieldEditorToolbar } from "@/components/templates/FieldEditorToolbar";
import { EditorViewState, DEFAULT_EDITOR_STATE, snapValue } from "@/lib/templates/editor";
import { alertClass } from "@/lib/status";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const PAGE_WIDTH = 720;

const DEFAULT_SIZE: Record<FieldType, { width: number; height: number }> = {
  signature: { width: 22, height: 6 },
  initials: { width: 10, height: 6 },
  date: { width: 16, height: 5 },
  text: { width: 22, height: 5 },
  checkbox: { width: 4, height: 4 },
  dropdown: { width: 24, height: 5 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

type MoveDragPayload = { id: string; offsetX: number; offsetY: number };

export default function FieldPlacementEditorClient({
  templateId,
  pdfUrl,
  pageCount,
  initialFields,
}: {
  templateId: string;
  pdfUrl: string;
  pageCount: number;
  initialFields: TemplateField[];
}) {
  const [fields, setFields] = useState<TemplateField[]>(initialFields);
  const [numPages, setNumPages] = useState<number>(pageCount);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [contextFieldId, setContextFieldId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorViewState>(DEFAULT_EDITOR_STATE);

  function maybeSnap(value: number) {
    return editor.snapMode === "grid" ? snapValue(value, editor.gridSize) : value;
  }

  function addField(page: number, fieldType: FieldType, centerXPct: number, centerYPct: number) {
    const size = DEFAULT_SIZE[fieldType];
    const field: TemplateField = {
      id: crypto.randomUUID(),
      page,
      x: clamp(maybeSnap(centerXPct - size.width / 2), 0, 100 - size.width),
      y: clamp(maybeSnap(centerYPct - size.height / 2), 0, 100 - size.height),
      width: size.width,
      height: size.height,
      field_type: fieldType,
      assigned_role: "Signer 1",
    };
    setFields((prev) => [...prev, field]);
  }

  function updateField(id: string, updates: Partial<TemplateField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }

  function moveField(id: string, page: number, xPct: number, yPct: number) {
    setFields((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              page,
              x: clamp(maybeSnap(xPct), 0, 100 - f.width),
              y: clamp(maybeSnap(yPct), 0, 100 - f.height),
            }
          : f,
      ),
    );
  }

  function deleteField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  const contextField = contextFieldId ? fields.find((f) => f.id === contextFieldId) : null;

  function handleDrop(e: React.DragEvent<HTMLDivElement>, page: number) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const newFieldType = e.dataTransfer.getData("application/x-new-field");
    const moveRaw = e.dataTransfer.getData("application/x-move-field");

    if (newFieldType) {
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;
      addField(page, newFieldType as FieldType, xPct, yPct);
      return;
    }

    if (moveRaw) {
      const { id, offsetX, offsetY } = JSON.parse(moveRaw) as MoveDragPayload;
      const xPct = ((e.clientX - rect.left - offsetX) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top - offsetY) / rect.height) * 100;
      moveField(id, page, xPct, yPct);
    }
  }

  useEffect(() => {
    if (!contextFieldId) return;
    const handler = () => setContextFieldId(null);
    window.addEventListener("click", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [contextFieldId]);

  async function handleSave() {
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const res = await fetch(`/api/v1/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field_layout: fields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Save failed. Please try again.");
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch (err) {
      setSaveStatus("error");
      setSaveError((err as Error).message);
    }
  }

   return (
    <div className="flex h-[78vh] min-h-[520px] gap-6">
      <div className="w-48 shrink-0 overflow-y-auto pr-1">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Fields</h2>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Drag onto the document to place.</p>
        <div className="mt-4 flex flex-col gap-2">
          {FIELD_TYPES.map((type) => (
            <div
              key={type}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("application/x-new-field", type)}
              className="cursor-grab rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] shadow-[var(--shadow-card)] active:cursor-grabbing"
            >
              {FIELD_TYPE_LABELS[type]}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saveStatus === "saving"}
          className="mt-6 w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-on-primary)] transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveStatus === "saving" ? "Saving…" : "Save layout"}
        </button>
        {saveStatus === "saved" && (
          <p className="mt-2 text-xs font-medium text-[var(--color-success)]">Saved.</p>
        )}
        {saveStatus === "error" && (
          <p className="mt-2 text-xs font-medium text-[var(--color-danger)]">{saveError}</p>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <FieldEditorToolbar state={editor} onChange={setEditor} />
        <div className="mt-3 flex-1 overflow-auto">
          {loadError && (
            <p className={`rounded-[var(--radius-sm)] px-3 py-2 text-sm ${alertClass("error")}`}>{loadError}</p>
          )}
          <div style={{ transform: `scale(${editor.zoom})`, transformOrigin: "top left" }}>
            <Document
              file={pdfUrl}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              onLoadError={(err) => setLoadError(err.message || "Could not load this PDF.")}
              loading={<p className="text-sm text-[var(--color-text-secondary)]">Loading document…</p>}
            >
              {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
                <div
                  key={pageNumber}
                  className="relative mb-6 inline-block rounded-[var(--radius-sm)] shadow-[var(--shadow-card)]"
                  onDrop={(e) => handleDrop(e, pageNumber)}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <Page pageNumber={pageNumber} width={PAGE_WIDTH} renderAnnotationLayer={false} renderTextLayer={false} />
                  {fields
                    .filter((f) => f.page === pageNumber)
                    .map((field) => (
                      <div
                        key={field.id}
                        draggable
                        onDragStart={(e) =>
                          e.dataTransfer.setData(
                            "application/x-move-field",
                            JSON.stringify({
                              id: field.id,
                              offsetX: e.nativeEvent.offsetX,
                              offsetY: e.nativeEvent.offsetY,
                            }),
                          )
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextFieldId(field.id);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextFieldId(field.id);
                        }}
                        style={{
                          left: `${field.x}%`,
                          top: `${field.y}%`,
                          width: `${field.width}%`,
                          height: `${field.height}%`,
                          backgroundColor: "rgba(99,102,241,0.16)",
                        }}
                        className="group absolute flex cursor-move items-center justify-between gap-1 overflow-hidden rounded-[var(--radius-sm)] border-2 border-[var(--color-primary)] px-1.5 text-[10px] font-medium text-[var(--color-primary-hover)]"
                      >
                        <span className="truncate">{FIELD_TYPE_LABELS[field.field_type]}</span>
                        <button
                          type="button"
                          draggable={false}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteField(field.id);
                          }}
                          className="rounded-full bg-white px-1 leading-4 text-[var(--color-danger)] opacity-0 transition group-hover:opacity-100"
                          aria-label={`Remove ${FIELD_TYPE_LABELS[field.field_type]} field`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  {contextField && (
                    <div
                      className="fixed z-20 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-3 shadow-[var(--shadow-card)]"
                      style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">Configure field</span>
                        <button
                          type="button"
                          onClick={() => setContextFieldId(null)}
                          className="rounded-full px-2 text-xs text-[var(--color-danger)]"
                        >
                          Close
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 text-sm">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-[var(--color-text-secondary)]">Assigned role</label>
                          <input
                            value={contextField.assigned_role}
                            onChange={(e) => updateField(contextField.id, { assigned_role: e.target.value })}
                            className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
                          />
                        </div>
                        <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)]">
                          <input
                            type="checkbox"
                            checked={Boolean(contextField.is_required)}
                            onChange={(e) => updateField(contextField.id, { is_required: e.target.checked })}
                          />
                          Required field
                        </label>
                        {contextField.field_type === "dropdown" && (
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-[var(--color-text-secondary)]">Options (one per line)</label>
                            <textarea
                              value={(contextField.dropdown_options ?? []).join("\n")}
                              onChange={(e) =>
                                updateField(contextField.id, {
                                  dropdown_options: e.target.value
                                    .split("\n")
                                    .map((opt) => opt.trim())
                                    .filter(Boolean),
                                })
                              }
                              rows={4}
                              className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-xs outline-none focus:border-[var(--color-primary)]"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
}