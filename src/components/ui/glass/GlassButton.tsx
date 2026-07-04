'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

type GlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'ghost';
};

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(function GlassButton(
  { className = '', variant = 'default', children, ...props },
  ref,
) {
  const baseClasses =
    'group relative inline-flex items-center justify-center rounded-[8px] border border-white/20 px-4 py-2 text-sm font-medium text-[color:var(--theme-text-primary)] transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[1.01]';

  const interactiveClasses =
    variant === 'ghost'
      ? 'bg-transparent hover:bg-white/30 dark:hover:bg-white/10'
      : 'bg-[color:var(--theme-surface)] hover:bg-white/45 dark:hover:bg-white/15';

  return (
    <button
      ref={ref}
      className={`${baseClasses} ${interactiveClasses} ${className}`}
      style={{
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
      }}
      {...props}
    >
      <span className="pointer-events-none absolute inset-0 rounded-[8px] border border-white/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      {children}
    </button>
  );
});
