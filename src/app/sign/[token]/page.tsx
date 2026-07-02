import { SignerEnvelopeView } from "@/components/signing/SignerEnvelopeView";
import { getSignerEnvelopeByToken } from "@/lib/envelopes/workflow";

export const dynamic = "force-dynamic";

export default async function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const context = await getSignerEnvelopeByToken(token);

  if (!context) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6 py-12">
        <section className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-[var(--shadow-card)]">
          <p className="text-sm font-medium text-[var(--color-primary)]">Signer view</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
            This signing link is invalid or expired.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
            Ask the sender for a fresh link.
          </p>
        </section>
      </main>
    );
  }

  return <SignerEnvelopeView token={token} context={context} />;
}
