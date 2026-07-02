import { TemplateUploadForm } from "@/components/templates/TemplateUploadForm";

export default function NewTemplatePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
        New template
      </h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Upload the document you want to reuse. You&apos;ll place fields on it next.
      </p>
      <TemplateUploadForm />
    </div>
  );
}
