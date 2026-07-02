"use client";

import { useState } from "react";
import type { SignerEnvelopeContext } from "@/lib/envelopes/types";

function statusClass(status: string) {
  if (status === "signed" || status === "COMPLETED") return "bg-emerald-50 text-[var(--color-success)]";
  if (status === "declined" || status === "DECLINED") return "bg-red-50 text-[var(--color-danger)]";
  if (status === "pending" || status === "DRAFT") return "bg-stone-100 text-[var(--color-text-secondary)]";
  return "bg-amber-50 text-[var(--color-warning)]";
}

export function SignerEnvelopeView({
  token,
  context,
}: {
  token: string;
  context: SignerEnvelopeContext;
}) {
  const [signatureText, setSignatureText] = useState(context.signer.signature_text ?? context.signer.name);
  const [status, setStatus] = useState<"idle" | "submitting" | "signed" | "error">(
    context.signer.status === "signed" ? "signed" : "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedEnvelopeTitle, setCompletedEnvelopeTitle] = useState<string | null>(null);

  const signed = status === "signed";
  const waiting = !context.canSign && context.signer.status === "pending";
  const displayStatus = signed ? "signed" : context.signer.status;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/signing/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature_text: signatureText }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Could not complete signing.");
      }

      setCompletedEnvelopeTitle(data?.envelope?.title ?? context.envelope.title);
      setStatus("signed");
    } catch (err) {
      setStatus("error");
      setErrorMessage((err as Error).message);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-8 text-[var(--color-text-primary)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-primary)]">Signer view</p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">
              {context.envelope.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {context.signer.name} · {context.signer.assigned_role}
            </p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${statusClass(displayStatus)}`}>
            {displayStatus}
          </span>
        </header>

        {signed && (
          <section className="rounded-[var(--radius-lg)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-[var(--shadow-card)]">
            Signed successfully.
            {completedEnvelopeTitle ? ` ${completedEnvelopeTitle} is now complete for this signer.` : null}
          </section>
        )}

        {waiting && (
          <section className="rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-[var(--shadow-card)]">
            This envelope is waiting on earlier signers. You can review the document, but signing is not ready yet.
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
            <div className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">
              Document preview
            </div>
            <div className="min-h-[72vh] bg-[#F5F5F4]">
              <iframe
                title="Document preview"
                src={context.pdfUrl}
                className="h-[72vh] w-full"
              />
            </div>
          </section>

          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Sign document</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Enter the signature text you want applied to the document.
            </p>

            {context.signer.status === "signed" ? (
              <p className="mt-4 rounded-[var(--radius-md)] bg-emerald-50 px-3 py-2 text-sm text-[var(--color-success)]">
                This signer already completed the envelope.
              </p>
            ) : context.canSign ? (
              <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="signature_text" className="text-sm font-medium text-[var(--color-text-primary)]">
                    Signature text
                  </label>
                  <input
                    id="signature_text"
                    value={signatureText}
                    onChange={(e) => setSignatureText(e.target.value)}
                    className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    autoComplete="name"
                    required
                  />
                </div>

                {errorMessage && (
                  <p className="rounded-[var(--radius-md)] bg-red-50 px-3 py-2 text-sm text-[var(--color-danger)]">
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "submitting" ? "Signing..." : "Sign document"}
                </button>
              </form>
            ) : (
              <p className="mt-4 rounded-[var(--radius-md)] bg-stone-100 px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                Signing is not available yet for this signer.
              </p>
            )}

            <div className="mt-6 border-t border-[var(--color-border)] pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
                Document status
              </p>
              <dl className="mt-3 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-text-secondary)]">Envelope</dt>
                  <dd className="text-right font-medium text-[var(--color-text-primary)]">
                    {context.envelope.status}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-text-secondary)]">Signing order</dt>
                  <dd className="text-right font-medium text-[var(--color-text-primary)]">
                    {context.envelope.signing_order}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-text-secondary)]">Expires</dt>
                  <dd className="text-right font-medium text-[var(--color-text-primary)]">
                    {new Date(context.envelope.expires_at).toLocaleDateString("en-US")}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
