'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/glass/GlassButton';

type EnvelopeActionsProps = {
  envelopeId: string;
  status: string;
  onSend?: () => void;
};

export function EnvelopeActions({ envelopeId, status, onSend }: EnvelopeActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canVoid = status === 'SENT' || status === 'VIEWED' || status === 'PARTIALLY_SIGNED';
  const canRemind = status === 'SENT' || status === 'VIEWED' || status === 'PARTIALLY_SIGNED';
  const canResend = status === 'SENT' || status === 'VIEWED' || status === 'PARTIALLY_SIGNED';

  const disabled = loading !== null;

  async function postAction(action: string) {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/v1/envelopes/${envelopeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? `Failed to ${action}.`);
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  const actions = useMemo(
    () => [
      ...(onSend ? [{ key: 'send', label: 'Send', onClick: onSend }] : []),
      ...(canRemind ? [{ key: 'remind', label: 'Remind', onClick: () => postAction('remind') }] : []),
      ...(canResend ? [{ key: 'resend', label: 'Resend', onClick: () => postAction('resend') }] : []),
      ...(canVoid ? [{ key: 'void', label: 'Void', onClick: () => postAction('void') }] : []),
    ],
    [onSend, canRemind, canResend, canVoid, envelopeId],
  );

  return (
    <div className="flex flex-col gap-2">
      {actions.length === 0 ? (
        <span className="text-xs text-[var(--color-text-secondary)]">No actions available.</span>
      ) : (
        <div className="flex flex-wrap gap-2">
          {actions.map(({ key, label, onClick }) => (
            <GlassButton
              key={key}
              type="button"
              disabled={disabled}
              onClick={onClick}
              className="text-sm"
            >
              {loading === key ? 'Working…' : label}
            </GlassButton>
          ))}
        </div>
      )}
      {error ? (
        <p className="text-xs font-medium text-[var(--color-danger)]">{error}</p>
      ) : null}
    </div>
  );
}