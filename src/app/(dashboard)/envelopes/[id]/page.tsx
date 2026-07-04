import { notFound } from "next/navigation";
import { requireServerUser } from "@/lib/auth/server";
import { SendEnvelopeButton } from "@/components/envelopes/SendEnvelopeButton";
import { getEnvelopeDetails } from "@/lib/envelopes/workflow";
import { AmbientBackgroundMotion } from "@/components/ui/AmbientBackgroundMotion";
import { GlassCard } from "@/components/ui/glass/GlassCard";

export const dynamic = "force-dynamic";

function statusClass(status: string) {
  if (status === "signed" || status === "COMPLETED") return "bg-emerald-50 text-[var(--color-success)]";
  if (status === "declined" || status === "DECLINED") return "bg-red-50 text-[var(--color-danger)]";
  if (status === "pending" || status === "DRAFT") return "bg-stone-100 text-[var(--color-text-secondary)]";
  return "bg-amber-50 text-[var(--color-warning)]";
}

export default async function EnvelopeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireServerUser();
  const envelope = await getEnvelopeDetails(id, user.id);
  if (!envelope) notFound();

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <AmbientBackgroundMotion />
      <div className="relative z-10 mx-auto max-w-6xl">
        <GlassCard className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-medium ${statusClass(envelope.status)}`}>
              {envelope.status}
            </p>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">{envelope.title}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {envelope.signing_order} signing · expires {new Date(envelope.expires_at).toLocaleDateString("en-US")}
            </p>
          </div>
          <SendEnvelopeButton envelopeId={envelope.id} disabled={envelope.status !== "DRAFT"} />
        </GlassCard>

        <GlassCard className="mt-8 p-6">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Signers</h2>
          <div className="mt-4 grid gap-3">
            {envelope.signers.map((signer) => (
              <GlassCard
                key={signer.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">{signer.name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {signer.user_email} · {signer.assigned_role} · order {signer.order_index}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(signer.status)}`}>
                  {signer.status}
                </span>
              </GlassCard>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="mt-6 p-6">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Activity</h2>
          <div className="mt-4 grid gap-3">
            {envelope.events.map((event) => {
              const reason = typeof event.metadata.reason === "string" ? event.metadata.reason.trim() : "";

              return (
                <GlassCard key={event.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{event.event_type}</p>
                  {reason ? (
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Reason: {reason}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {event.actor} · {new Date(event.timestamp).toLocaleString("en-US")}
                  </p>
                </GlassCard>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
