import * as SecureStore from 'expo-secure-store';
import { PermissionsAndroid, Platform } from 'react-native';
import { getNotifications } from './expoNotificationsSafe';

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

async function hasOsNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const api =
        typeof Platform.Version === 'number'
          ? Platform.Version
          : parseInt(String(Platform.Version), 10) || 0;
      if (api < 33) return true;
      const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
      if (!permission) return false;
      return await PermissionsAndroid.check(permission);
    }

    const Notifications = getNotifications();
    if (!Notifications) return false;
    const current = await Notifications.getPermissionsAsync();
    const iosStatus = current.ios?.status;
    return (
      current.granted === true ||
      current.status === 'granted' ||
      iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
    );
  } catch {
    return false;
  }
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
    if (await isPushNotificationsOptedOut()) return false;
    return await hasOsNotificationPermission();
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
