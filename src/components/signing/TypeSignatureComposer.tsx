'use client';

import { useEffect, useRef, useState } from 'react';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { GlassCard } from '@/components/ui/glass/GlassCard';

const PREVIEW_WIDTH = 900;
const PREVIEW_HEIGHT = 320;

type TypeSignatureComposerProps = {
  defaultName?: string;
  onConfirm?: (imageDataUrl: string) => Promise<void> | void;
};

export function TypeSignatureComposer({ defaultName = "Alex Morgan", onConfirm }: TypeSignatureComposerProps) {
  const [name, setName] = useState(defaultName);
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const linkId = 'dancing-script-font';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    drawSignaturePreview(name);
  }, [name]);

  const drawSignaturePreview = (value: string) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const safeValue = value.trim() || 'Your Name';
    canvas.width = PREVIEW_WIDTH;
    canvas.height = PREVIEW_HEIGHT;

    context.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    context.fillStyle = 'rgba(248,250,252,0.85)';
    context.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);

    const gradient = context.createLinearGradient(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(1, 'rgba(245,247,250,0.75)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.strokeStyle = 'rgba(15, 23, 42, 0.16)';
    context.lineJoin = 'round';

    const maxChars = safeValue.length > 18 ? 18 : 22;
    const fontSize = safeValue.length > maxChars ? 88 : 120;
    context.font = `700 ${fontSize}px "Dancing Script", cursive`;
    context.lineWidth = 2.6;
    context.strokeText(safeValue, PREVIEW_WIDTH / 2, PREVIEW_HEIGHT / 2 + 24);
    context.fillStyle = '#0f172a';
    context.fillText(safeValue, PREVIEW_WIDTH / 2, PREVIEW_HEIGHT / 2 + 24);
  };

  const handleConfirm = async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = PREVIEW_WIDTH;
    exportCanvas.height = PREVIEW_HEIGHT;

    const exportContext = exportCanvas.getContext('2d');
    if (!exportContext) {
      return;
    }

    exportContext.drawImage(canvas, 0, 0);
    const dataUrl = exportCanvas.toDataURL('image/png');
    setPngDataUrl(dataUrl);
    if (onConfirm) {
      await onConfirm(dataUrl);
    }
  };

  const handleDownload = () => {
    if (!pngDataUrl) {
      return;
    }

    const link = document.createElement('a');
    link.href = pngDataUrl;
    link.download = 'signature.png';
    link.click();
  };

  return (
    <GlassCard className="w-full max-w-3xl border-white/25 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] sm:p-8">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--theme-text-secondary)]">
            Type your signature
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--theme-text-primary)]">
            Create a polished handwritten signature
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--theme-text-secondary)]">
            Type your name, preview it in a cursive style, and confirm to generate a PNG version.
          </p>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--theme-text-primary)]">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Type your name"
            className="w-full rounded-[var(--radius-md)] border border-[color:var(--theme-border)] bg-white/75 px-3 py-3 text-sm text-[var(--theme-text-primary)] outline-none transition focus:border-[color:var(--theme-accent)] focus:ring-2 focus:ring-[color:var(--theme-accent)]/20"
          />
        </label>

        <div className="rounded-[24px] border border-[color:var(--theme-border)] bg-white/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl">
          <canvas
            ref={canvasRef}
            className="h-48 w-full rounded-[18px] border border-white/60 bg-white/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <GlassButton onClick={handleConfirm} className="px-4 py-2">
            Confirm signature
          </GlassButton>
          <GlassButton variant="ghost" onClick={handleDownload} disabled={!pngDataUrl} className="px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50">
            Download PNG
          </GlassButton>
        </div>

        {pngDataUrl ? (
          <div className="space-y-3 rounded-[20px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)]/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[var(--theme-text-primary)]">PNG ready</p>
              <span className="text-xs uppercase tracking-[0.24em] text-[var(--theme-text-secondary)]">
                export complete
              </span>
            </div>
            <img src={pngDataUrl} alt="Generated signature preview" className="h-40 w-full rounded-[14px] border border-white/50 object-contain bg-white/70" />
          </div>
        ) : null}
      </div>
    </GlassCard>
  );
}
