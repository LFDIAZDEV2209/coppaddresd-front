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
  const [lang, setLangState] = useState<Language>(initialLang);

  // Mount-only: apply localStorage ONLY when no cookie exists (fresh browser).
  // When the cookie IS present, the server already rendered the correct language
  // via initialLang — no flash, no re-render needed.
  useEffect(() => {
    if (!document.cookie.includes(`${STORAGE_KEY}=`)) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'es' || stored === 'en') {
        setLangState(prev => prev === stored ? prev : stored);
      }
    }

    // If logged in, fetch server preference and apply if different.
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
    const found = dictionaries[lang][source];
    let translated = found && found.length > 0 ? found : source;
    if (!found && lang !== 'es' && !warnedKeys.has(source)) {
      warnedKeys.add(source);
      console.warn(`[i18n] Missing key for "${lang}":`, source);
    }
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        translated = translated.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      });
    }
    return translated;
  }, [lang]);

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
