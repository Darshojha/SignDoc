import Link from "next/link";
import { EnvelopeCreateForm } from "@/components/envelopes/EnvelopeCreateForm";
import { listTemplates } from "@/lib/templates/db";

export const dynamic = "force-dynamic";

export default async function NewEnvelopePage() {
  const templates = await listTemplates();
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
        <div className="mt-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-card)]">
          <p className="font-medium text-[var(--color-text-primary)]">
            No fielded templates available
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Upload a PDF and place at least one signer field before creating an envelope.
          </p>
          <Link
            href="/templates/new"
            className="mt-4 inline-block rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            Upload a template
          </Link>
        </div>
      ) : (
        <EnvelopeCreateForm templates={usableTemplates} />
      )}
    </div>
  );
}
