import Link from "next/link";
import { listTemplates } from "@/lib/templates/db";
import { requireServerUser } from "@/lib/auth/server";
import { AmbientBackgroundMotion } from "@/components/ui/AmbientBackgroundMotion";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassNavItem } from "@/components/ui/glass/GlassNavItem";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const user = await requireServerUser();
  const templates = await listTemplates(user.id);

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <AmbientBackgroundMotion />
      <div className="relative z-10 mx-auto max-w-6xl">
        <GlassCard className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              Templates
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Upload a document once, place fields, and reuse it for every signer.
            </p>
          </div>
          <GlassNavItem href="/templates/new">New template</GlassNavItem>
        </GlassCard>

        {templates.length === 0 ? (
          <GlassCard className="mt-8 flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-base font-medium text-[var(--color-text-primary)]">
              No templates yet - create your first one
            </p>
            <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">
              Upload your first document and place signature fields on it to create a
              reusable template.
            </p>
            <Link
              href="/templates/new"
              className="mt-2 inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
            >
              Upload your first document
            </Link>
          </GlassCard>
        ) : (
          <ul className="mt-6 grid gap-3">
            {templates.map((template) => (
              <li key={template.id}>
                <GlassCard interactive className="p-0">
                  <Link
                    href={`/templates/${template.id}/edit`}
                    className="flex items-center justify-between rounded-[var(--radius-lg)] px-5 py-4"
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
                </GlassCard>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
