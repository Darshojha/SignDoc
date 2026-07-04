import Link from "next/link";
import { EnvelopeCreateForm } from "@/components/envelopes/EnvelopeCreateForm";
import { listTemplates } from "@/lib/templates/db";
import { requireServerUser } from "@/lib/auth/server";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassButton } from "@/components/ui/glass/GlassButton";

export const dynamic = "force-dynamic";

export default async function NewEnvelopePage() {
  const user = await requireServerUser();
  const templates = await listTemplates(user.id);
  const usableTemplates = templates.filter((template) => template.field_layout.length > 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
        New envelope
      </h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Choose a document with fields already placed, add real signers, then send it.
      </p>

      {usableTemplates.length === 0 ? (
        <GlassCard className="mt-6 border-dashed p-8">
          <p className="font-medium text-[var(--color-text-primary)]">
            No fielded templates available
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Upload a PDF and place at least one signer field before creating an envelope.
          </p>
          <Link href="/templates/new" className="mt-4 inline-flex">
            <GlassButton>Upload a template</GlassButton>
          </Link>
        </GlassCard>
      ) : (
        <EnvelopeCreateForm templates={usableTemplates} />
      )}
    </div>
  );
}
