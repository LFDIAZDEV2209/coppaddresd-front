/**
 * Locale de fechas compartido: el I18nProvider lo sincroniza con el idioma
 * activo (es → es-ES, en → en-US). Los formateadores de fechas lo leen al
 * renderizar sin recibirlo por props; el valor por defecto conserva el
 * comportamiento histórico (es-ES) fuera del provider.
 */

const LOCALES: Record<string, string> = {
  es: "es-ES",
  en: "en-US",
};

let current = LOCALES.es;

export function setDateLocale(lang: string): void {
  current = LOCALES[lang] ?? lang;
}

export function getDateLocale(): string {
  return current;
}
