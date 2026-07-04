'use client';

import { useEffect, useState } from 'react';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { TypeSignatureComposer } from '@/components/signing/TypeSignatureComposer';
import { DrawSignatureComposer } from '@/components/signing/DrawSignatureComposer';
import { UploadSignatureComposer } from '@/components/signing/UploadSignatureComposer';

type SignatureMethod = 'typed' | 'drawn' | 'uploaded';
type SignatureCaptureModalProps = {
  open: boolean;
  fieldType: 'signature' | 'initials';
  loading?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    imageDataUrl: string;
    method: SignatureMethod;
    fieldType: 'signature' | 'initials';
  }) => Promise<void> | void;
};

const tabs: Array<{ id: SignatureMethod; label: string }> = [
  { id: 'typed', label: 'Type' },
  { id: 'drawn', label: 'Draw' },
  { id: 'uploaded', label: 'Upload' },
];

export function SignatureCaptureModal({
  open,
  fieldType,
  loading = false,
  onClose,
  onConfirm,
}: SignatureCaptureModalProps) {
  const [activeTab, setActiveTab] = useState<SignatureMethod>('typed');

  useEffect(() => {
    if (open) {
      setActiveTab('typed');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleConfirm = async (imageDataUrl: string) => {
    await onConfirm({ imageDataUrl, method: activeTab, fieldType });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
      <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/20 bg-[color:var(--theme-surface)]/95 p-5 shadow-[0_32px_80px_rgba(15,23,42,0.28)] backdrop-blur-2xl sm:p-7">
        <div className="flex flex-col gap-4 border-b border-white/20 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--theme-text-secondary)]">
              Add your signature
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--theme-text-primary)]">
              {fieldType === 'initials' ? 'Add initials' : 'Add signature'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--theme-text-secondary)]">
              Choose a method and confirm to save the image for this signer.
            </p>
          </div>
          <GlassButton variant="ghost" onClick={onClose} className="px-3 py-2">
            Close
          </GlassButton>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'border-[color:var(--theme-accent)] bg-[color:var(--theme-accent)]/15 text-[color:var(--theme-accent)]'
                  : 'border-white/20 bg-white/40 text-[var(--theme-text-secondary)] hover:bg-white/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {activeTab === 'typed' ? (
            <TypeSignatureComposer onConfirm={handleConfirm} />
          ) : null}
          {activeTab === 'drawn' ? (
            <DrawSignatureComposer onConfirm={handleConfirm} />
          ) : null}
          {activeTab === 'uploaded' ? (
            <UploadSignatureComposer onConfirm={handleConfirm} />
          ) : null}
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-[var(--theme-text-secondary)]">Saving signature image…</p>
        ) : null}
      </div>
    </div>
  );
}
