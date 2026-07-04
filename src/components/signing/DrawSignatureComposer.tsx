'use client';

import { useEffect, useRef, useState } from 'react';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { GlassCard } from '@/components/ui/glass/GlassCard';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 320;

type Point = { x: number; y: number };
type Stroke = Point[];

type DrawSignatureComposerProps = {
  onConfirm?: (imageDataUrl: string) => Promise<void> | void;
};

export function DrawSignatureComposer({ onConfirm }: DrawSignatureComposerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<Stroke>([]);
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 2.8;
    context.strokeStyle = '#0f172a';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.strokeStyle = '#0f172a';
  }, []);

  useEffect(() => {
    redraw();
  }, [strokes, activeStroke]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    if ('touches' in event) {
      const touch = event.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    strokes.forEach((stroke) => {
      if (stroke.length < 2) {
        return;
      }

      context.beginPath();
      context.moveTo(stroke[0].x, stroke[0].y);
      stroke.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.stroke();
    });

    if (activeStroke.length > 1) {
      context.beginPath();
      context.moveTo(activeStroke[0].x, activeStroke[0].y);
      activeStroke.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.stroke();
    }
  };

  const startStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getPoint(event);
    if (!point) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDrawing(true);
    setActiveStroke([point]);
  };

  const moveStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return;
    }

    const point = getPoint(event);
    if (!point) {
      return;
    }

    setActiveStroke((current) => [...current, point]);
  };

  const endStroke = () => {
    if (!isDrawing) {
      return;
    }

    setStrokes((current) => [...current, activeStroke]);
    setActiveStroke([]);
    setIsDrawing(false);
  };

  const handleClear = () => {
    setStrokes([]);
    setActiveStroke([]);
    setPngDataUrl(null);
  };

  const handleUndo = () => {
    setStrokes((current) => current.slice(0, -1));
    setPngDataUrl(null);
  };

  const handleConfirm = async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
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
    link.download = 'drawn-signature.png';
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
            Use your mouse or finger to draw, then confirm to export a PNG version.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <GlassButton variant="ghost" onClick={handleUndo} className="px-4 py-2">
            Undo
          </GlassButton>
          <GlassButton variant="ghost" onClick={handleClear} className="px-4 py-2">
            Clear
          </GlassButton>
          <GlassButton onClick={handleConfirm} className="px-4 py-2">
            Confirm signature
          </GlassButton>
          <GlassButton variant="ghost" onClick={handleDownload} disabled={!pngDataUrl} className="px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50">
            Download PNG
          </GlassButton>
        </div>

        <div className="rounded-[24px] border border-[color:var(--theme-border)] bg-white/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl">
          <canvas
            ref={canvasRef}
            className="h-48 w-full rounded-[18px] border border-white/70 bg-white"
            onPointerDown={startStroke}
            onPointerMove={moveStroke}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
            onPointerCancel={endStroke}
            style={{ touchAction: 'none' }}
          />
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
