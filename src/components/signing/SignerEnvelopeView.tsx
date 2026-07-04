"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import type { EnvelopeWithDetails, SignerEnvelopeContext } from "@/lib/envelopes/types";
import type { CapturedSignature } from "@/lib/envelopes/signatures";
import type { TemplateField } from "@/lib/templates/types";
import { SignatureCaptureModal } from "@/components/signing/SignatureCaptureModal";
import { AmbientBackgroundMotion } from "@/components/ui/AmbientBackgroundMotion";
import { GlassButton } from "@/components/ui/glass/GlassButton";
import { GlassCard } from "@/components/ui/glass/GlassCard";

const SignerDocumentWithFields = dynamic(
  () =>
    import("@/components/signing/SignerDocumentWithFields").then(
      (module) => module.SignerDocumentWithFields,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="p-4 text-sm text-[var(--color-text-secondary)]">Loading document…</p>
    ),
  },
);

function statusClass(status: string) {
  if (status === "signed" || status === "COMPLETED") return "bg-emerald-50 text-[var(--color-success)]";
  if (status === "declined" || status === "DECLINED") return "bg-red-50 text-[var(--color-danger)]";
  if (status === "pending" || status === "DRAFT") return "bg-stone-100 text-[var(--color-text-secondary)]";
  return "bg-amber-50 text-[var(--color-warning)]";
}

function signaturesByFieldId(entries: CapturedSignature[]) {
  return Object.fromEntries(entries.map((entry) => [entry.field_id, entry]));
}

export function SignerEnvelopeView({
  token,
  context,
}: {
  token: string;
  context: SignerEnvelopeContext;
}) {
  const [declineReason, setDeclineReason] = useState("");
  const [envelope, setEnvelope] = useState<EnvelopeWithDetails>(context.envelope);
  const [signer, setSigner] = useState(context.signer);
  const [canSign, setCanSign] = useState(context.canSign);
  const [signatures, setSignatures] = useState<CapturedSignature[]>([]);
  const [signaturesLoading, setSignaturesLoading] = useState(true);
  const [signaturesLoadError, setSignaturesLoadError] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<TemplateField | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "submitting" | "declining" | "signed" | "declined" | "error"
  >(
    context.signer.status === "signed"
      ? "signed"
      : context.signer.status === "declined"
        ? "declined"
        : "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const signed = status === "signed" || signer.status === "signed";
  const declined = status === "declined" || signer.status === "declined";
  const waiting = !canSign && signer.status === "pending";
  const displayStatus = signed ? "signed" : declined ? "declined" : signer.status;
  const currentCanSign = canSign;

  const signerFields = useMemo(
    () =>
      (envelope.document?.field_layout ?? []).filter(
        (field) => field.assigned_role === signer.assigned_role,
      ),
    [envelope.document?.field_layout, signer.assigned_role],
  );

  const requiredSignatureFields = useMemo(
    () =>
      signerFields.filter(
        (field) => field.field_type === "signature" || field.field_type === "initials",
      ),
    [signerFields],
  );

  const signatureMap = useMemo(() => signaturesByFieldId(signatures), [signatures]);

  const unsignedRequiredCount = useMemo(
    () => requiredSignatureFields.filter((field) => !signatureMap[field.id]).length,
    [requiredSignatureFields, signatureMap],
  );

  const allRequiredSigned = unsignedRequiredCount === 0;

  useEffect(() => {
    let cancelled = false;

    async function loadSignatures() {
      setSignaturesLoading(true);
      setSignaturesLoadError(null);
      try {
        const res = await fetch(`/api/v1/signing/${token}/signatures`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.message ?? "Could not load saved signatures.");
        }
        if (!cancelled) {
          setSignatures(data.signatures ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setSignaturesLoadError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setSignaturesLoading(false);
        }
      }
    }

    void loadSignatures();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSignatureConfirm(payload: {
    imageDataUrl: string;
    method: "typed" | "drawn" | "uploaded";
    fieldType: "signature" | "initials";
  }) {
    if (!activeField) {
      return;
    }

    setModalSaving(true);
    setModalError(null);

    try {
      const res = await fetch(`/api/v1/signing/${token}/signatures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_id: activeField.id,
          image_data: payload.imageDataUrl,
          method: payload.method,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Could not save this signature.");
      }

      const saved = data.signature as CapturedSignature;
      setSignatures((current) => {
        const withoutField = current.filter((entry) => entry.field_id !== saved.field_id);
        return [...withoutField, saved];
      });
      setActiveField(null);
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setModalSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (requiredSignatureFields.length > 0 && !allRequiredSigned) {
      setErrorMessage(
        `Sign all required fields before completing (${unsignedRequiredCount} remaining).`,
      );
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/v1/signing/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature_text: signer.name }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Could not complete signing.");
      }

      if (data?.envelope) {
        setEnvelope(data.envelope);
        const refreshedSigner = data.envelope.signers.find((candidate: typeof signer) => candidate.id === signer.id);
        if (refreshedSigner) {
          setSigner(refreshedSigner);
        }
        setCanSign(false);
      }
      setSuccessMessage(`Signed successfully. ${data?.envelope?.title ?? envelope.title} is now complete for this signer.`);
      setStatus("signed");
    } catch (err) {
      setStatus("error");
      setErrorMessage((err as Error).message);
    }
  }

  async function handleDecline() {
    if (!declineReason.trim()) {
      setErrorMessage("Provide a decline reason before submitting.");
      return;
    }

    setStatus("declining");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/v1/envelopes/${envelope.id}/signers/${signer.id}/decline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Signer-Token": token,
        },
        body: JSON.stringify({ reason: declineReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Could not submit the decline.");
      }

      if (data?.envelope) {
        setEnvelope(data.envelope);
        const refreshedSigner = data.envelope.signers.find((candidate: typeof signer) => candidate.id === signer.id);
        if (refreshedSigner) {
          setSigner(refreshedSigner);
        }
        setCanSign(false);
      }
      setStatus("declined");
      setSuccessMessage("Declined successfully. The envelope is now closed for this signer.");
    } catch (err) {
      setStatus("error");
      setErrorMessage((err as Error).message);
    }
  }

  const showFieldOverlay = Boolean(envelope.document && signerFields.length > 0);

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-[var(--color-text-primary)] sm:px-6 lg:px-8">
      <AmbientBackgroundMotion />
      <SignatureCaptureModal
        open={activeField !== null}
        fieldType={
          activeField?.field_type === "initials" ? "initials" : "signature"
        }
        defaultName={signer.name}
        loading={modalSaving}
        errorMessage={modalError}
        onClose={() => {
          if (!modalSaving) {
            setActiveField(null);
            setModalError(null);
          }
        }}
        onConfirm={handleSignatureConfirm}
      />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6">
        <GlassCard className="flex flex-col gap-3 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-primary)]">Signer view</p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">
              {envelope.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {signer.name} · {signer.assigned_role}
            </p>
          </div>
          <span className={`w-fit rounded-full border border-white/20 bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur ${statusClass(displayStatus)}`}>
            {displayStatus}
          </span>
        </GlassCard>

        {signed && (
          <GlassCard className="px-4 py-3 text-sm text-emerald-700">
            {successMessage ?? "Signed successfully."}
          </GlassCard>
        )}

        {declined && (
          <GlassCard className="px-4 py-3 text-sm text-[var(--color-danger)]">
            {successMessage ?? "Declined successfully."}
          </GlassCard>
        )}

        {waiting && (
          <GlassCard className="px-4 py-3 text-sm text-amber-700">
            This envelope is waiting on earlier signers. You can review the document, but signing is not ready yet.
          </GlassCard>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <GlassCard className="overflow-hidden p-0">
            <div className="border-b border-white/20 px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">
              Document preview
            </div>
            <div className="min-h-[72vh] overflow-auto bg-white/15 p-4">
              {showFieldOverlay ? (
                <SignerDocumentWithFields
                  pdfUrl={context.pdfUrl}
                  pageCount={envelope.document?.page_count ?? 1}
                  fields={signerFields}
                  signatures={signatureMap}
                  canInteract={currentCanSign && !signed && !declined}
                  onFieldClick={setActiveField}
                />
              ) : (
                <iframe
                  title="Document preview"
                  src={context.pdfUrl}
                  className="h-[72vh] w-full"
                />
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Sign document</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {requiredSignatureFields.length > 0
                ? "Click each signature field on the document, then complete signing."
                : "Review the document and complete signing when ready."}
            </p>

            {signer.status === "signed" ? (
              <p className="mt-4 rounded-[var(--radius-md)] bg-emerald-50/70 px-3 py-2 text-sm text-[var(--color-success)]">
                This signer already completed the envelope.
              </p>
            ) : signer.status === "declined" ? (
              <p className="mt-4 rounded-[var(--radius-md)] bg-red-50/70 px-3 py-2 text-sm text-[var(--color-danger)]">
                This signer already declined the envelope.
              </p>
            ) : currentCanSign ? (
              <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                {signaturesLoading ? (
                  <p className="text-sm text-[var(--color-text-secondary)]">Loading saved signatures…</p>
                ) : null}
                {signaturesLoadError ? (
                  <p className="rounded-[var(--radius-md)] bg-red-50/70 px-3 py-2 text-sm text-[var(--color-danger)]">
                    {signaturesLoadError}
                  </p>
                ) : null}

                {requiredSignatureFields.length > 0 ? (
                  <div className="rounded-[var(--radius-md)] border border-white/20 bg-white/20 p-4 backdrop-blur">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Required fields</p>
                    <ul className="mt-2 space-y-2 text-sm text-[var(--color-text-secondary)]">
                      {requiredSignatureFields.map((field) => {
                        const captured = signatureMap[field.id];
                        return (
                          <li key={field.id} className="flex items-center justify-between gap-3">
                            <span className="capitalize">{field.field_type}</span>
                            {captured ? (
                              <img
                                src={captured.image_data}
                                alt={`Signed ${field.field_type}`}
                                className="h-8 max-w-[120px] rounded border border-white/40 object-contain bg-white/70"
                              />
                            ) : (
                              <span className="text-[var(--color-warning)]">Unsigned</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {!allRequiredSigned ? (
                      <p className="mt-3 text-xs text-[var(--color-warning)]">
                        {unsignedRequiredCount} required field{unsignedRequiredCount === 1 ? "" : "s"} still need a signature.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <GlassButton
                  type="submit"
                  disabled={
                    status === "submitting" ||
                    status === "declining" ||
                    signaturesLoading ||
                    (requiredSignatureFields.length > 0 && !allRequiredSigned)
                  }
                  className="w-full"
                >
                  {status === "submitting" ? "Completing…" : "Complete Signing"}
                </GlassButton>

                <div className="rounded-[var(--radius-md)] border border-white/20 bg-white/20 p-4 backdrop-blur">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="decline_reason" className="text-sm font-medium text-[var(--color-text-primary)]">
                      Decline reason
                    </label>
                    <textarea
                      id="decline_reason"
                      value={declineReason}
                      onChange={(event) => setDeclineReason(event.target.value)}
                      className="min-h-[110px] rounded-[var(--radius-sm)] border border-white/20 bg-white/25 px-3 py-2 text-sm outline-none backdrop-blur focus:border-[var(--color-primary)]"
                      placeholder="Explain why you are declining this envelope."
                    />
                  </div>
                  <GlassButton
                    type="button"
                    onClick={handleDecline}
                    disabled={status === "submitting" || status === "declining"}
                    className="mt-4 w-full"
                    variant="ghost"
                  >
                    {status === "declining" ? "Declining..." : "Decline document"}
                  </GlassButton>
                </div>
              </form>
            ) : (
              <p className="mt-4 rounded-[var(--radius-md)] bg-stone-100/70 px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                Signing is not available yet for this signer.
              </p>
            )}

            <div className="mt-6 border-t border-white/20 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
                Document status
              </p>
              <dl className="mt-3 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-text-secondary)]">Envelope</dt>
                  <dd className="text-right font-medium text-[var(--color-text-primary)]">
                    {envelope.status}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-text-secondary)]">Signing order</dt>
                  <dd className="text-right font-medium text-[var(--color-text-primary)]">
                    {envelope.signing_order}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--color-text-secondary)]">Expires</dt>
                  <dd className="text-right font-medium text-[var(--color-text-primary)]">
                    {new Date(envelope.expires_at).toLocaleDateString("en-US")}
                  </dd>
                </div>
              </dl>
              {errorMessage && (
                <p className="mt-4 rounded-[var(--radius-md)] bg-red-50/70 px-3 py-2 text-sm text-[var(--color-danger)]">
                  {errorMessage}
                </p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </main>
  );
}
