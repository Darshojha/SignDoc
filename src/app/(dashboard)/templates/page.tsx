import Link from "next/link";
import { listTemplates } from "@/lib/templates/db";
import { requireServerUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const user = await requireServerUser();
  const templates = await listTemplates(user.id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            Templates
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Upload a document once, place fields, and reuse it for every signer.
          </p>
        </div>
        <Link
          href="/templates/new"
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
        >
          New template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
          <p className="text-base font-medium text-[var(--color-text-primary)]">
            No templates yet
          </p>
          <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">
            Upload your first document and place signature fields on it to create a
            reusable template.
          </p>
          <Link
            href="/templates/new"
            className="mt-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            Upload your first document
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {templates.map((template) => (
            <li key={template.id}>
              <Link
                href={`/templates/${template.id}/edit`}
                className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-hover)]"
              >
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {template.name}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {template.page_count} page{template.page_count === 1 ? "" : "s"} ·{" "}
                    {template.field_layout.length} field
                    {template.field_layout.length === 1 ? "" : "s"} placed
                  </p>
                </div>
                <span className="text-sm text-[var(--color-text-secondary)]">Edit →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
