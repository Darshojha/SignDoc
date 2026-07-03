import Link from "next/link";
import { listEnvelopes } from "@/lib/envelopes/workflow";
import { requireServerUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

function statusClass(status: string) {
  if (status === "COMPLETED") return "bg-emerald-50 text-[var(--color-success)]";
  if (status === "DECLINED" || status === "VOIDED") return "bg-red-50 text-[var(--color-danger)]";
  if (status === "DRAFT") return "bg-stone-100 text-[var(--color-text-secondary)]";
  return "bg-amber-50 text-[var(--color-warning)]";
}

export default async function EnvelopesPage() {
  const user = await requireServerUser();
  const envelopes = await listEnvelopes(user.id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            Envelopes
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Create, send, and track documents through signature.
          </p>
        </div>
        <Link
          href="/envelopes/new"
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
        >
          New envelope
        </Link>
      </div>

      {envelopes.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
          <p className="text-base font-medium text-[var(--color-text-primary)]">
            No envelopes yet
          </p>
          <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">
            Create an envelope from a fielded template and send it to a signer.
          </p>
          <Link
            href="/envelopes/new"
            className="mt-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            Create an envelope
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {envelopes.map((envelope) => (
            <li key={envelope.id}>
              <Link
                href={`/envelopes/${envelope.id}`}
                className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-hover)]"
              >
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {envelope.title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {envelope.signing_order} signing
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(envelope.status)}`}>
                  {envelope.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
