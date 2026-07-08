'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { GlassCard } from '@/components/ui/glass/GlassCard';

type Point = { x: number; y: number };
type Stroke = Point[];

export function DrawSignatureComposer({ onConfirm }: { onConfirm?: (imageDataUrl: string) => Promise<void> | void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<Stroke>([]);
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : 'clientX' in event ? event.clientX : 0;
    const clientY = 'touches' in event ? event.touches[0].clientY : 'clientY' in event ? event.clientY : 0;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = '#0f172a';
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    const renderStroke = (points: Point[]) => {
      if (points.length === 0) return;
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index++) {
        context.lineTo(points[index].x, points[index].y);
      }
      context.stroke();
    };

    strokes.forEach(renderStroke);
    renderStroke(activeStroke);
  }, [strokes, activeStroke]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const startStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getPoint(event);
    if (!point) return;
    setActiveStroke([point]);
  };

  const moveStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getPoint(event);
    if (!point) return;
    setActiveStroke((current) => [...current, point]);
  };

  const endStroke = () => {
    if (activeStroke.length > 0) {
      setStrokes((current) => [...current, activeStroke]);
    }
    setActiveStroke([]);
  };

  const handleConfirm = async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.clientWidth;
    exportCanvas.height = canvas.clientHeight;

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
            Draw your signature
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--theme-text-primary)]">
            Sketch a signature directly on canvas
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--theme-text-secondary)]">
            Use a mouse or touch to draw. Confirm to save the signature image.
          </p>
        </div>

        <div className="rounded-[24px] border border-[color:var(--theme-border)] bg-white/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl">
          <canvas
            ref={canvasRef}
            className="h-64 w-full touch-none rounded-[18px] border border-white/60 bg-white/40"
            onPointerDown={startStroke}
            onPointerMove={moveStroke}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
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
              <span className="text-xs uppercase tracking-[0.24em] text-[var(--theme-text-secondary)]">export complete</span>
            </div>
            <img src={pngDataUrl} alt="Generated signature preview" className="h-40 w-full rounded-[14px] border border-white/50 object-contain bg-white/70" />
          </div>
        ) : null}
      </div>
    </GlassCard>
  );
}