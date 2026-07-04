import { AnchorHTMLAttributes, forwardRef } from 'react';

type GlassNavItemProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  active?: boolean;
};

export const GlassNavItem = forwardRef<HTMLAnchorElement, GlassNavItemProps>(function GlassNavItem(
  { className = '', active = false, children, ...props },
  ref,
) {
  return (
    <a
      ref={ref}
      className={`group relative inline-flex items-center rounded-[10px] border border-white/20 px-3 py-2 text-sm font-medium text-[color:var(--theme-text-primary)] transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-white/30 dark:hover:bg-white/10 ${active ? 'bg-[color:var(--theme-surface)]' : 'bg-transparent'} ${className} glass-panel`}
      style={{
        boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.35)' : 'none',
      }}
      {...props}
    >
      <span className="pointer-events-none absolute inset-0 rounded-[10px] border border-white/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <span className="relative z-10">{children}</span>
    </a>
  );
});
