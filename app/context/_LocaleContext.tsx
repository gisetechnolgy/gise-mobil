import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { setAppLocale, type AppLocale } from '../../lib/appLocale';
import { clearBrandingCache } from '../../lib/brandingSource';
import { clearDefinitionsCache } from '../../lib/definitions';
import { clearHeroFeaturedCache } from '../../lib/heroFeatured';
import { t, tReplace, type TranslationKey } from '../../lib/i18n';
import { loadStoredLocale, saveStoredLocale } from '../../lib/localeStorage';

type LocaleContextValue = {
  locale: AppLocale;
  ready: boolean;
  setLocale: (locale: AppLocale) => Promise<void>;
  toggleLocale: () => Promise<void>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('tr');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadStoredLocale();
      if (cancelled) return;
      setAppLocale(stored);
      setLocaleState(stored);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback(async (next: AppLocale) => {
    setAppLocale(next);
    setLocaleState(next);
    await saveStoredLocale(next);
    clearDefinitionsCache();
    clearBrandingCache();
    clearHeroFeaturedCache();
  }, []);

  const toggleLocale = useCallback(async () => {
    await setLocale(locale === 'tr' ? 'en' : 'tr');
  }, [locale, setLocale]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, ready, setLocale, toggleLocale }),
    [locale, ready, setLocale, toggleLocale],
  );

  if (!ready) return null;

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return ctx;
}

export function useTranslation() {
  const { locale } = useLocale();
  const translate = useCallback(
    (key: TranslationKey) => t(key, locale),
    [locale],
  );
  const translateReplace = useCallback(
    (key: TranslationKey, vars: Record<string, string>) =>
      tReplace(key, vars, locale),
    [locale],
  );
  return { t: translate, tReplace: translateReplace, locale };
}
