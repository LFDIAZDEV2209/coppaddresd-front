'use client';

import { Globe } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';

export function LanguageToggle() {
  const { lang, toggleLang, t } = useI18n();

  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label={t('Cambiar idioma a {target}', { target: lang === 'es' ? 'English' : 'Español' })}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      title={t(lang === 'es' ? 'Cambiar a English' : 'Cambiar a Español')}
    >
      <Globe className="h-4 w-4" />
      <span className="hidden sm:inline">{lang === 'es' ? 'ES' : 'EN'}</span>
    </button>
  );
}