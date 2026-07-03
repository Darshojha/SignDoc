import { notFound } from "next/navigation";
import { requireServerUser } from "@/lib/auth/server";
import { SendEnvelopeButton } from "@/components/envelopes/SendEnvelopeButton";
import { getEnvelopeDetails } from "@/lib/envelopes/workflow";

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
    <div>
      <div className="flex items-start justify-between gap-6">
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
      </div>

      <section className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Signers</h2>
        <div className="mt-4 grid gap-3">
          {envelope.signers.map((signer) => (
            <div
              key={signer.id}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3"
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
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Activity</h2>
        <div className="mt-4 grid gap-3">
          {envelope.events.map((event) => {
            const reason = typeof event.metadata.reason === "string" ? event.metadata.reason.trim() : "";

            return (
              <div key={event.id} className="rounded-[var(--radius-md)] bg-[#F5F5F4] px-4 py-3">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{event.event_type}</p>
                {reason ? (
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Reason: {reason}</p>
                ) : null}
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {event.actor} · {new Date(event.timestamp).toLocaleString("en-US")}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
