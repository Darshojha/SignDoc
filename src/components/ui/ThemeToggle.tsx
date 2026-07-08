'use client';

import { useLayoutEffect, useState } from 'react';

const STORAGE_KEY = 'signdoc-theme';
const THEME_ATTRIBUTE = 'data-theme';

type ThemeMode = 'light' | 'dark';

function getPreferredTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('light');

  // Initialize theme from storage/system preference.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useLayoutEffect(() => {
    const initialTheme = getPreferredTheme();
    setTheme(initialTheme);
    document.documentElement.setAttribute(THEME_ATTRIBUTE, initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
    document.documentElement.style.setProperty('color-scheme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute(THEME_ATTRIBUTE, nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    document.documentElement.style.setProperty('color-scheme', nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className="fixed right-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/60 text-[color:var(--theme-text-primary)] backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[color:var(--theme-accent)] dark:bg-black/40"
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {theme === 'light' ? '☀' : '☾'}
      </span>
    </button>
  );
}