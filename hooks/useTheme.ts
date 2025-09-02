import { useEffect, useState, useCallback } from 'react';

const THEME_KEY = 'theme';

export type AppTheme = 'light' | 'dark';

function getInitialTheme(): AppTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_KEY) as AppTheme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyThemeClass(theme: AppTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>(() => getInitialTheme());

  // Ensure DOM is in sync with state
  useEffect(() => {
    applyThemeClass(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
    // Broadcast to other listeners in this tab
    window.dispatchEvent(new CustomEvent('alignzo:theme-change', { detail: { theme } }));
  }, [theme]);

  // Sync when another tab changes localStorage
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setThemeState(e.newValue as AppTheme);
      }
    };
    const onCustom = (e: Event) => {
      const ce = e as CustomEvent<{ theme: AppTheme }>;
      if (ce.detail?.theme && ce.detail.theme !== theme) setThemeState(ce.detail.theme);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('alignzo:theme-change', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('alignzo:theme-change', onCustom as EventListener);
    };
  }, [theme]);

  // Optional: react to system preference only if user hasn't set a choice yet
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return;
    } catch {}
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setThemeState(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setTheme = useCallback((t: AppTheme) => setThemeState(t), []);

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  } as const;
}
