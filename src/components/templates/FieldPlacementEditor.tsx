"use client";

import dynamic from "next/dynamic";
import type { TemplateField } from "@/lib/templates/types";

// react-pdf touches browser-only APIs (canvas, DOMMatrix), so it must never
// run during server rendering — even inside a "use client" component, Next
// still SSRs the first pass unless the import itself opts out.
const FieldPlacementEditorClient = dynamic(
  () => import("@/components/templates/FieldPlacementEditorClient"),
  {
    ssr: false,
    loading: () => (
      <p className="mt-6 text-sm text-[var(--color-text-secondary)]">Loading editor…</p>
    ),
  },
);

export function FieldPlacementEditor(props: {
  templateId: string;
  pdfUrl: string;
  pageCount: number;
  initialFields: TemplateField[];
}) {
  return <FieldPlacementEditorClient {...props} />;
}
