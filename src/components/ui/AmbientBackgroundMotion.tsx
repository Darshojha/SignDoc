'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type MotionState = {
  x: number;
  y: number;
  phase: number;
};

type ViewportSize = {
  width: number;
  height: number;
};

export function AmbientBackgroundMotion() {
  const [motion, setMotion] = useState<MotionState>({ x: 0, y: 0, phase: 0 });
  const [viewport, setViewport] = useState<ViewportSize>({ width: 0, height: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const displayRef = useRef({ x: 0, y: 0 });
  const phaseRef = useRef(0);

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);

    let animationFrame = 0;

    const tick = () => {
      const nextX = displayRef.current.x + (targetRef.current.x - displayRef.current.x) * 0.06;
      const nextY = displayRef.current.y + (targetRef.current.y - displayRef.current.y) * 0.06;
      const nextPhase = phaseRef.current + 0.015;

      displayRef.current = { x: nextX, y: nextY };
      phaseRef.current = nextPhase;
      setMotion({ x: nextX, y: nextY, phase: nextPhase });
      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);

    const handlePointerMove = (event: MouseEvent) => {
      targetRef.current = { x: event.clientX, y: event.clientY };
    };

    window.addEventListener('mousemove', handlePointerMove);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('mousemove', handlePointerMove);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  const wavePath = useMemo(() => {
    if (!viewport.width || !viewport.height) {
      return '';
    }

    const width = viewport.width;
    const height = viewport.height;
    const amplitude = 72;
    const segmentCount = 80;
    const baseY = height * 0.58;

    const points = Array.from({ length: segmentCount + 1 }, (_, index) => {
      const x = (index / segmentCount) * width;
      const dx = x - motion.x;
      const distanceFactor = Math.max(0, 1 - Math.abs(dx) / (width * 0.45));
      const waveOffset = Math.sin((x / width) * Math.PI * 2 + motion.phase * 0.7) * amplitude * distanceFactor;
      const softLift = Math.sin((x / width) * Math.PI + motion.phase * 0.3) * 18;
      const y = baseY + waveOffset + softLift;

      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');

    return `${points} L ${width} ${height} L 0 ${height} Z`;
  }, [motion.phase, motion.x, viewport.height, viewport.width]);

  const rippleRings = useMemo(() => {
    if (!viewport.width || !viewport.height) {
      return [];
    }

    return Array.from({ length: 4 }, (_, index) => {
      const radius = 90 + index * 70 + Math.sin(motion.phase + index * 0.8) * 10;
      return {
        cx: motion.x + Math.sin(index + motion.phase) * 10,
        cy: motion.y + Math.cos(index * 0.8 + motion.phase) * 10,
        r: radius,
        opacity: 0.018 + index * 0.008,
      };
    });
  }, [motion.phase, motion.x, motion.y, viewport.height, viewport.width]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <svg
        viewBox={`0 0 ${viewport.width || 1} ${viewport.height || 1}`}
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="ambient-wave-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.65)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
        </defs>

        <path
          d={wavePath}
          fill="url(#ambient-wave-gradient)"
          opacity="0.18"
          stroke="rgba(255,255,255,0.24)"
          strokeWidth="1.2"
        />

        <path
          d={wavePath}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.6"
          transform={`translate(0, ${viewport.height ? viewport.height * 0.02 : 0})`}
        />

        {rippleRings.map((ring, index) => (
          <circle
            key={index}
            cx={ring.cx}
            cy={ring.cy}
            r={ring.r}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
            opacity={ring.opacity}
          />
        ))}
      </svg>
    </div>
  );
}
