type SignDocLogoProps = {
  className?: string;
};

export function SignDocLogo({ className = "h-8 w-8" }: SignDocLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="SignDoc monogram"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="4" width="56" height="56" rx="16" className="fill-white/20 dark:fill-white/10" />
      <path
        d="M20 16H42C46.4183 16 50 19.5817 50 24V24C50 28.4183 46.4183 32 42 32H28V46"
        stroke="url(#signdoc-metal-gradient)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 48V24"
        stroke="url(#signdoc-metal-gradient)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M28 32H42"
        stroke="url(#signdoc-metal-gradient)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="signdoc-metal-gradient" x1="16" y1="14" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--theme-accent)" />
          <stop offset="50%" stopColor="var(--theme-text-primary)" />
          <stop offset="100%" stopColor="var(--theme-accent-strong)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
