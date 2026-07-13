import { listTemplates } from "@/lib/templates/db";
import { requireServerUser } from "@/lib/auth/server";
import { AmbientBackgroundMotion } from "@/components/ui/AmbientBackgroundMotion";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassNavItem } from "@/components/ui/glass/GlassNavItem";
import { TemplateList } from "@/components/templates/TemplateList";

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
            <GlassNavItem href="/templates/new">Upload your first document</GlassNavItem>
          </GlassCard>
        ) : (
          <TemplateList initialTemplates={templates} />
        )}
      </div>
    </div>
  );
}
