import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AppLocale } from './appLocale';

const LOCALE_KEY = 'app.locale';

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  }
  return SecureStore.getItemAsync(key);
}

function parseLocale(value: string | null): AppLocale {
  return value === 'en' ? 'en' : 'tr';
}

export async function loadStoredLocale(): Promise<AppLocale> {
  const stored = await getItem(LOCALE_KEY);
  return parseLocale(stored);
}

export async function saveStoredLocale(locale: AppLocale): Promise<void> {
  await setItem(LOCALE_KEY, locale);
}
