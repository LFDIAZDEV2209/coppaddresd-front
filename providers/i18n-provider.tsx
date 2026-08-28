'use client';

import { createContext, useContext, useMemo, useState, useCallback, useEffect, type ReactNode } from 'react';
import { getPreferences, updatePreferenceLang } from '@/lib/api/preferences-service';
import { getAccessToken } from '@/lib/api/http';
import es from './translations/es.json';
import en from './translations/en.json';

type Language = 'es' | 'en';

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (source: string, params?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'copp_lang';
const dictionaries: Record<Language, Record<string, string>> = { es, en };
const warnedKeys = new Set<string>();
const missingKeys = new Set<string>();

// Module-level auth listener so AuthProvider can notify without circular imports.
let onAuthChange: (() => void) | null = null;

export function setAuthChangeListener(handler: (() => void) | null): void {
  onAuthChange = handler;
}

export function notifyAuthChanged(): void {
  onAuthChange?.();
}

function writeCookie(lang: Language): void {
  if (typeof document !== 'undefined') {
    document.cookie = `${STORAGE_KEY}=${lang}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
  }
}

export function I18nProvider({
  children,
  initialLang = 'es',
}: {
  children: ReactNode;
  initialLang?: Language;
}) {
  // Lazy initializer: aplica localStorage SOLO cuando no existe cookie (navegador
  // fresco). Cuando la cookie existe, el server ya renderizó el idioma correcto
  // vía initialLang — sin flash ni re-render.
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof document !== 'undefined' && !document.cookie.includes(`${STORAGE_KEY}=`)) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'es' || stored === 'en') return stored;
    }
    return initialLang;
  });

  useEffect(() => {
    // Si hay sesión, obtiene la preferencia del servidor y la aplica si difiere.
    if (getAccessToken()) {
      getPreferences()
        .then((pref) => {
          const serverLang = pref.lang;
          if (serverLang === 'es' || serverLang === 'en') {
            setLangState((prev) => {
              if (prev !== serverLang) {
                localStorage.setItem(STORAGE_KEY, serverLang);
                writeCookie(serverLang);
                return serverLang;
              }
              return prev;
            });
          }
        })
        .catch(() => { /* not logged in or server error — ignore */ });
    }
  }, []);

  // Re-sync when auth state changes (login / logout).
  useEffect(() => {
    function handleAuthChange() {
      if (getAccessToken()) {
        getPreferences()
          .then((pref) => {
            const serverLang = pref.lang;
            if (serverLang === 'es' || serverLang === 'en') {
              setLangState((prev) => {
                if (prev !== serverLang) {
                  localStorage.setItem(STORAGE_KEY, serverLang);
                  writeCookie(serverLang);
                  return serverLang;
                }
                return prev;
              });
            }
          })
          .catch(() => { /* ignore */ });
      }
    }

    setAuthChangeListener(handleAuthChange);
    return () => setAuthChangeListener(null);
  }, []);

  // Keep <html lang> in sync for a11y.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((source: string, params?: Record<string, string>): string => {
    if (source == null) return ''; // evitar t(null) / t(undefined)
    const found = dictionaries[lang][source];
    let translated = found && found.length > 0 ? found : source;
    if (!found && lang !== 'es') {
      if (!warnedKeys.has(source)) {
        warnedKeys.add(source);
        console.warn(`[i18n] Missing key for "${lang}":`, source);
      }
      missingKeys.add(source);
    }
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        translated = translated.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      });
    }
    return translated;
  }, [lang]);

  // Dev-only: flush missing keys to /api/i18n/missing for auto-translation.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const timer = setTimeout(() => {
      if (missingKeys.size === 0) return;
      const keys = [...missingKeys].slice(0, 50);
      missingKeys.clear();
      void fetch('/api/i18n/missing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys }),
      }).catch(() => { /* retry next flush */ });
    }, 3000);
    return () => clearTimeout(timer);
  });

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
    writeCookie(newLang);
    // Sync to backend if logged in (fire-and-forget).
    if (getAccessToken()) {
      updatePreferenceLang(newLang).catch(() => { /* ignore */ });
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLangState(prev => {
      const next = prev === 'es' ? 'en' : 'es';
      localStorage.setItem(STORAGE_KEY, next);
      writeCookie(next);
      if (getAccessToken()) {
        updatePreferenceLang(next).catch(() => { /* ignore */ });
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ lang, setLang, toggleLang, t }), [lang, setLang, toggleLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useT() {
  const { t } = useI18n();
  return t;
}
