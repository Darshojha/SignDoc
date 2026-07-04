'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { GlassCard } from '@/components/ui/glass/GlassCard';

const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

type UploadSignatureComposerProps = {
  onConfirm?: (imageDataUrl: string) => Promise<void> | void;
};

async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function UploadSignatureComposer({ onConfirm }: UploadSignatureComposerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmedImageUrl, setConfirmedImageUrl] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    setConfirmedImageUrl(null);

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setError('Please upload a PNG or JPG image.');
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setError('Image must be 2MB or smaller.');
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(nextPreviewUrl);
  };

  const handleConfirm = async () => {
    if (!previewUrl) {
      return;
    }

    const dataUrl = await blobUrlToDataUrl(previewUrl);
    setConfirmedImageUrl(dataUrl);
    if (onConfirm) {
      await onConfirm(dataUrl);
    }
  };

  const statusLabel = useMemo(() => {
    if (error) {
      return error;
    }

    if (confirmedImageUrl) {
      return 'Signature image ready for export.';
    }

    if (selectedFile) {
      return `${selectedFile.name} selected and ready to confirm.`;
    }

    return 'Upload a PNG or JPG file up to 2MB.';
  }, [confirmedImageUrl, error, selectedFile]);

  return (
    <GlassCard className="w-full max-w-3xl border-white/25 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] sm:p-8">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--theme-text-secondary)]">
            Upload your signature
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--theme-text-primary)]">
            Import a signature image for review
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--theme-text-secondary)]">
            Choose a PNG or JPG file up to 2MB, preview it, and confirm when it looks right.
          </p>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-[color:var(--theme-border)] bg-white/55 px-6 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl transition hover:bg-white/70">
          <input type="file" accept="image/png,image/jpeg,image/jpg" className="sr-only" onChange={handleFileChange} />
          <span className="text-sm font-medium text-[var(--theme-text-primary)]">Click to upload a signature image</span>
          <span className="mt-2 text-sm text-[var(--theme-text-secondary)]">PNG or JPG only · max 2MB</span>
        </label>

        <div className="rounded-[20px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)]/70 p-4">
          <p className="text-sm text-[var(--theme-text-primary)]">{statusLabel}</p>
        </div>

        {previewUrl ? (
          <div className="space-y-3 rounded-[24px] border border-[color:var(--theme-border)] bg-white/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[var(--theme-text-primary)]">Preview</p>
              <GlassButton onClick={handleConfirm} className="px-4 py-2">
                Confirm image
              </GlassButton>
            </div>
            <img src={previewUrl} alt="Signature preview" className="h-48 w-full rounded-[18px] border border-white/60 object-contain bg-white/70" />
          </div>
        ) : null}

        {confirmedImageUrl ? (
          <div className="space-y-3 rounded-[20px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)]/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[var(--theme-text-primary)]">Ready to use</p>
              <span className="text-xs uppercase tracking-[0.24em] text-[var(--theme-text-secondary)]">
                confirmed
              </span>
            </div>
            <img src={confirmedImageUrl} alt="Confirmed signature" className="h-40 w-full rounded-[14px] border border-white/50 object-contain bg-white/70" />
          </div>
        ) : null}
      </div>
    </GlassCard>
  );
}
