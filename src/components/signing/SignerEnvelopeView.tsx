'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import type { EnvelopeWithDetails, SignerEnvelopeContext } from '@/lib/envelopes/types';
import type { CapturedSignature } from '@/lib/envelopes/signatures';
import type { TemplateField } from '@/lib/templates/types';
import { SignatureCaptureModal } from '@/components/signing/SignatureCaptureModal';
import { AmbientBackgroundMotion } from '@/components/ui/AmbientBackgroundMotion';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { GlassCard } from '@/components/ui/glass/GlassCard';
import { statusBadgeClass, alertClass } from '@/lib/status';

const SignerDocumentWithFields = dynamic(
  () =>
    import('@/components/signing/SignerDocumentWithFields').then(
      (module) => module.SignerDocumentWithFields,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="p-4 text-sm text-[var(--color-text-secondary)]">Loading document…</p>
    ),
  },
);

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
  const [declineReason, setDeclineReason] = useState('');
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
    'idle' | 'submitting' | 'declining' | 'signed' | 'declined' | 'error'
  >(
    context.signer.status === 'signed'
      ? 'signed'
      : context.signer.status === 'declined'
        ? 'declined'
        : 'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<{ field: TemplateField; signature: CapturedSignature } | null>(null);

  const signed = status === 'signed' || signer.status === 'signed';
  const declined = status === 'declined' || signer.status === 'declined';
  const waiting = !canSign && signer.status === 'pending';
  const displayStatus = signed ? 'signed' : declined ? 'declined' : signer.status;
  const currentCanSign = canSign;

  const signerFields = useMemo(
    () =>
      (envelope.document?.field_layout ?? []).filter(
        (field) => field.assigned_role === signer.assigned_role,
      ),
    [envelope.document?.field_layout, signer.assigned_role],
  );

  const requiredFields = useMemo(
    () => signerFields.filter((field) => field.assigned_role === signer.assigned_role && isFieldRequired(field)),
    [signerFields, signer.assigned_role],
  );

  const requiredSignatureFields = useMemo(
    () =>
      requiredFields.filter(
        (field) => field.field_type === 'signature' || field.field_type === 'initials',
      ),
    [requiredFields],
  );

  const signatureMap = useMemo(() => signaturesByFieldId(signatures), [signatures]);

  const unsignedRequiredCount = useMemo(
    () => requiredFields.filter((field) => !isFieldFilled(field, signatureMap)).length,
    [requiredFields, signatureMap],
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
          throw new Error(data?.error?.message ?? 'Could not load saved signatures.');
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

  // Persist a non-signature field value (date/text/dropdown/checkbox) so it survives
  // reload and lands in the final signed PDF. Optimistic, reverts on error.
  async function persistFieldValue(fieldId: string, value: string) {
    const optimistic: CapturedSignature = {
      id: crypto.randomUUID(),
      envelope_id: envelope.id,
      signer_id: signer.id,
      field_id: fieldId,
      image_data: value,
      method: 'typed',
      signed_at: new Date().toISOString(),
      ip_address: null,
    };
    setSignatures((current) => [...current.filter((entry) => entry.field_id !== fieldId), optimistic]);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/signing/${token}/signatures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_id: fieldId, image_data: value, method: 'typed' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Could not save this field.');
      const saved = data.signature as CapturedSignature;
      setSignatures((current) => [...current.filter((entry) => entry.field_id !== fieldId), saved]);
    } catch (err) {
      setSignatures((current) => current.filter((entry) => entry.field_id !== fieldId));
      setErrorMessage((err as Error).message);
    }
  }

  async function removeFieldValue(fieldId: string) {
    setSignatures((current) => current.filter((entry) => entry.field_id !== fieldId));
    try {
      const res = await fetch(`/api/v1/signing/${token}/signatures`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_id: fieldId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? 'Could not clear this field.');
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  function handleDateChange(fieldId: string, iso: string) {
    return iso ? persistFieldValue(fieldId, iso) : removeFieldValue(fieldId);
  }

  function handleDropdownChange(fieldId: string, value: string) {
    return value ? persistFieldValue(fieldId, value) : removeFieldValue(fieldId);
  }

  function handleTextChange(fieldId: string, text: string) {
    return text ? persistFieldValue(fieldId, text) : removeFieldValue(fieldId);
  }

  function handleCheckboxToggle(fieldId: string, checked: boolean) {
    return checked ? persistFieldValue(fieldId, '✓') : removeFieldValue(fieldId);
  }

  async function handleSignatureConfirm(payload: {
    imageDataUrl: string;
    method: 'typed' | 'drawn' | 'uploaded';
    fieldType: 'signature' | 'initials';
  }) {
    if (!activeField) {
      return;
    }

    setModalSaving(true);
    setModalError(null);

    try {
      const res = await fetch(`/api/v1/signing/${token}/signatures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_id: activeField.id,
          image_data: payload.imageDataUrl,
          method: payload.method,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Could not save this signature.');
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

  function validateRequiredFields() {
    const errors: Record<string, boolean> = {};
    requiredFields.forEach((field) => {
      if (!isFieldFilled(field, signatureMap)) {
        errors[field.id] = true;
      }
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validateRequiredFields()) {
      setErrorMessage('Please complete all required fields before signing.');
      return;
    }

    setStatus('submitting');
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/v1/signing/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature_text: signer.name }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Could not complete signing.');
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
      setStatus('signed');
    } catch (err) {
      setStatus('error');
      setErrorMessage((err as Error).message);
    }
  }

  async function handleDecline() {
    if (!declineReason.trim()) {
      setErrorMessage('Provide a decline reason before submitting.');
      return;
    }

    setStatus('declining');
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/v1/envelopes/${envelope.id}/signers/${signer.id}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signer-Token': token,
        },
        body: JSON.stringify({ reason: declineReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Could not submit the decline.');
      }

      if (data?.envelope) {
        setEnvelope(data.envelope);
        const refreshedSigner = data.envelope.signers.find((candidate: typeof signer) => candidate.id === signer.id);
        if (refreshedSigner) {
          setSigner(refreshedSigner);
        }
        setCanSign(false);
      }
      setStatus('declined');
      setSuccessMessage('Declined successfully. The envelope is now closed for this signer.');
    } catch (err) {
      setStatus('error');
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
          activeField?.field_type === 'initials' ? 'initials' : 'signature'
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
          <span className={`w-fit rounded-full border border-white/20 bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur ${statusBadgeClass(displayStatus)}`}>
            {displayStatus}
          </span>
        </GlassCard>

        {signed && (
          <GlassCard className={`px-4 py-3 text-sm ${alertClass('success')}`}>
            {successMessage ?? 'Signed successfully.'}
          </GlassCard>
        )}

        {declined && (
          <GlassCard className={`px-4 py-3 text-sm ${alertClass('error')}`}>
            {successMessage ?? 'Declined successfully.'}
          </GlassCard>
        )}

        {waiting && (
          <GlassCard className={`px-4 py-3 text-sm ${alertClass('warning')}`}>
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
                  onFieldContextMenu={(field, signature) =>
                    setContextMenu({ field, signature })
                  }
                  onDateChange={handleDateChange}
                  onTextChange={handleTextChange}
                  onCheckboxToggle={handleCheckboxToggle}
                  onDropdownChange={handleDropdownChange}
                  fieldErrors={fieldErrors}
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
                ? 'Click each signature field on the document, then complete signing.'
                : 'Review the document and complete signing when ready.'}
            </p>

                {signer.status === 'signed' ? (
                  <p className={`mt-4 rounded-[var(--radius-md)] px-3 py-2 text-sm ${alertClass('success')}`}>
                    This signer already completed the envelope.
                  </p>
                ) : signer.status === 'declined' ? (
                  <p className={`mt-4 rounded-[var(--radius-md)] px-3 py-2 text-sm ${alertClass('error')}`}>
                    This signer already declined the envelope.
                  </p>
            ) : currentCanSign ? (
              <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                {signaturesLoading ? (
                  <p className="text-sm text-[var(--color-text-secondary)]">Loading saved signatures…</p>
                ) : null}
                {signaturesLoadError ? (
                  <p className={`rounded-[var(--radius-md)] px-3 py-2 text-sm ${alertClass('error')}`}>
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
                        {unsignedRequiredCount} required field{unsignedRequiredCount === 1 ? '' : 's'} still need a signature.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <GlassButton
                  type="submit"
                  disabled={
                    status === 'submitting' ||
                    status === 'declining' ||
                    signaturesLoading ||
                    (requiredSignatureFields.length > 0 && !allRequiredSigned)
                  }
                  className="w-full"
                >
                  {status === 'submitting' ? 'Completing…' : 'Complete Signing'}
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
                    disabled={status === 'submitting' || status === 'declining'}
                    className="mt-4 w-full"
                    variant="ghost"
                  >
                    {status === 'declining' ? 'Declining...' : 'Decline document'}
                  </GlassButton>
                </div>
              </form>
                ) : (
                  <p className={`mt-4 rounded-[var(--radius-md)] px-3 py-2 text-sm ${alertClass('warning')}`}>
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
                    {new Date(envelope.expires_at).toLocaleDateString('en-US')}
                  </dd>
                </div>
              </dl>
              {errorMessage && (
                <p className={`mt-4 rounded-[var(--radius-md)] px-3 py-2 text-sm ${alertClass('error')}`}>
                  {errorMessage}
                </p>
              )}
            </div>
          </GlassCard>
        </div>

        {contextMenu ? (
          <div
            className="fixed inset-0 z-50"
            onClick={() => setContextMenu(null)}
          >
            <div
              className="absolute rounded-lg border border-white/20 bg-white/90 p-1 shadow-lg backdrop-blur"
              style={{ top: contextMenu.field.y + '%', left: contextMenu.field.x + '%' }}
              onClick={(event) => event.stopPropagation()}
            >
              {contextMenu.field.field_type === 'signature' || contextMenu.field.field_type === 'initials' ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-[var(--color-text-primary)] hover:bg-white/70"
                  onClick={() => {
                    setActiveField(contextMenu.field);
                    setContextMenu(null);
                  }}
                >
                  Edit
                </button>
              ) : null}
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-[var(--color-danger)] hover:bg-red-50"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/v1/signing/${token}/signatures`, {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ field_id: contextMenu.signature.field_id }),
                    });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      throw new Error(data?.error?.message ?? 'Could not delete signature.');
                    }
                    setSignatures((current) =>
                      current.filter((entry) => entry.field_id !== contextMenu.signature.field_id),
                    );
                  } catch (err) {
                    setErrorMessage((err as Error).message);
                  } finally {
                    setContextMenu(null);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function isFieldRequired(field: TemplateField): boolean {
  return (field as TemplateField & { is_required?: boolean }).is_required === true;
}

function isFieldFilled(field: TemplateField, signatureMap: Record<string, CapturedSignature>): boolean {
  const captured = signatureMap[field.id];
  if (!captured) return false;
  if (field.field_type === 'checkbox') return true;
  if (field.field_type === 'date') {
    const digits = captured.image_data.replace(/\D/g, '');
    return digits.length === 8;
  }
  if (field.field_type === 'text') return captured.image_data.trim().length > 0;
  return captured.image_data.trim().length > 0;
}