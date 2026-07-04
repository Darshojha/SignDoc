import { HTMLAttributes, forwardRef } from 'react';

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { className = '', interactive = false, children, ...props },
  ref,
) {
  const interactiveClasses = interactive
    ? 'transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[1.01]'
    : '';

  return (
    <div
      ref={ref}
      className={`rounded-[12px] border border-white/20 bg-[color:var(--theme-surface)] p-4 text-[color:var(--theme-text-primary)] shadow-[var(--theme-shadow-card)] ${interactiveClasses} ${className} glass-panel`}
      {...props}
    >
      {children}
    </div>
  );
});
