import Link from "next/link";
import { listEnvelopes } from "@/lib/envelopes/workflow";
import { requireServerUser } from "@/lib/auth/server";
import { AmbientBackgroundMotion } from "@/components/ui/AmbientBackgroundMotion";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassNavItem } from "@/components/ui/glass/GlassNavItem";
import { EnvelopesBrowser } from "@/components/envelopes/EnvelopesBrowser";

export const dynamic = "force-dynamic";

export default async function EnvelopesPage() {
  const user = await requireServerUser();
  const envelopes = await listEnvelopes(user.id);

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <AmbientBackgroundMotion />
      <div className="relative z-10 mx-auto max-w-6xl">
        <GlassCard className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              Envelopes
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Create, send, and track documents through signature.
            </p>
          </div>
          <GlassNavItem href="/envelopes/new">New envelope</GlassNavItem>
        </GlassCard>

        {envelopes.length === 0 ? (
          <GlassCard className="mt-8 flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-base font-medium text-[var(--color-text-primary)]">
              No envelopes yet - create your first one
            </p>
            <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">
              Create an envelope from a fielded template and send it to a signer.
            </p>
              <Link
                href="/envelopes/new"
                className="mt-2 inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-on-primary)] transition hover:bg-[var(--color-primary-hover)]"
              >
                Create an envelope
              </Link>
          </GlassCard>
        ) : (
          <EnvelopesBrowser envelopes={envelopes} />
        )}
      </div>
    </div>
  );
}
