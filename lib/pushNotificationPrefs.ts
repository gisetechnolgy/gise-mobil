import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PREF_KEY = 'prefs.pushNotificationsEnabled';
const PROMPT_KEY = 'prefs.pushPermissionPromptShown';

async function getPref(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  }
  return SecureStore.getItemAsync(key);
}

async function setPref(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

/** Kullanıcı profilde bildirimleri bilinçli kapattıysa true. */
export async function isPushNotificationsOptedOut(): Promise<boolean> {
  try {
    const stored = await getPref(PREF_KEY);
    return stored === 'false';
  } catch {
    return false;
  }
}

/** Sistem izni verilmiş ve kullanıcı bildirimleri kapatmamışsa true. */
export async function readPushNotificationsEnabled(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return false;
    return !(await isPushNotificationsOptedOut());
  } catch {
    return false;
  }
}

export async function writePushNotificationsEnabled(
  enabled: boolean,
): Promise<void> {
  try {
    await setPref(PREF_KEY, enabled ? 'true' : 'false');
  } catch {
    /* sessiz */
  }
}

export async function readPushPermissionPromptShown(): Promise<boolean> {
  try {
    return (await getPref(PROMPT_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function writePushPermissionPromptShown(): Promise<void> {
  try {
    await setPref(PROMPT_KEY, 'true');
  } catch {
    /* sessiz */
  }
}
