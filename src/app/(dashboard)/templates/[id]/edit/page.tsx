import { notFound } from "next/navigation";
import { requireServerUser } from "@/lib/auth/server";
import { getTemplateById } from "@/lib/templates/db";
import { getTemplateSignedUrl } from "@/lib/templates/storage";
import { FieldPlacementEditor } from "@/components/templates/FieldPlacementEditor";

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireServerUser();
  const template = await getTemplateById(id, user.id);

  if (!template) {
    notFound();
  }

  const pdfUrl = await getTemplateSignedUrl(template.storage_path);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
        {template.name}
      </h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Drag fields from the left onto the document, then save the layout.
      </p>
      <div className="mt-6">
        <FieldPlacementEditor
          templateId={template.id}
          pdfUrl={pdfUrl}
          pageCount={template.page_count}
          initialFields={template.field_layout}
        />
      </div>
    </div>
  );
}
