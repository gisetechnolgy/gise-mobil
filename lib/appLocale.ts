export type AppLocale = 'tr' | 'en';

let currentLocale: AppLocale = 'tr';

export function getAppLocale(): AppLocale {
  return currentLocale;
}

export function setAppLocale(locale: AppLocale): void {
  currentLocale = locale;
}

export function getIntlLocale(locale: AppLocale = getAppLocale()): string {
  return locale === 'en' ? 'en-GB' : 'tr-TR';
}
