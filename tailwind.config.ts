import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: 'var(--theme-background)',
        foreground: 'var(--theme-text-primary)',
        surface: 'var(--theme-surface)',
        border: 'var(--theme-border)',
        muted: 'var(--theme-text-secondary)',
        accent: 'var(--theme-accent)',
        'accent-strong': 'var(--theme-accent-strong)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        metal: 'var(--theme-shadow-card)',
        'metal-hover': 'var(--theme-shadow-hover)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
    },
  },
  plugins: [],
};

export default config;
