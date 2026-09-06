import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';
import {
  isPushNotificationsOptedOut,
  readPushNotificationsEnabled,
  writePushNotificationsEnabled,
} from './pushNotificationPrefs';
import { secureStorage } from './secureStorage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const TOKEN_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('push_token_timeout'));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function resolveProjectId(): string | undefined {
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    Constants.expoConfig?.extra?.eas?.projectId
  );
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Bildirimler',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch {
    /* kanal oluşturulamazsa devam et */
  }
}

/** Sistem izin diyaloğunu açar (ayarlar toggle / ilk açılış prompt). */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    if (existing === 'denied') return false;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/** İzin verilmişse Expo push token döner; izin istemez. */
export async function fetchExpoPushTokenIfGranted(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;

    await ensureAndroidChannel();

    const projectId = resolveProjectId();
    if (!projectId) return null;

    const tokenData = await withTimeout(
      Notifications.getExpoPushTokenAsync({ projectId }),
      TOKEN_TIMEOUT_MS,
    );
    return tokenData.data ?? null;
  } catch {
    return null;
  }
}

/** İzin ister, ardından token alır. */
export async function fetchExpoPushTokenWithPermissionRequest(): Promise<
  string | null
> {
  try {
    if (!Device.isDevice) return null;
    const granted = await requestNotificationPermission();
    if (!granted) return null;
    return await fetchExpoPushTokenIfGranted();
  } catch {
    return null;
  }
}

/** Expo token'ı Nest API'ye kaydeder (JWT gerekli). */
export async function registerPushTokenWithBackend(
  token: string,
): Promise<boolean> {
  try {
    const accessToken = await secureStorage.getAccessToken();
    if (!accessToken) return false;

    await api.post(
      '/notifications/tokens',
      {
        token,
        platform:
          Platform.OS === 'ios' || Platform.OS === 'android'
            ? Platform.OS
            : 'web',
      },
      { auth: true },
    );
    return true;
  } catch {
    return false;
  }
}

async function unregisterPushTokenFromBackend(token: string): Promise<void> {
  try {
    await api.post('/notifications/tokens/unregister', { token });
  } catch {
    /* sessiz */
  }
}

/**
 * İzin verilmiş ve kullanıcı ayarlardan kapatmamışsa token'ı backend'e yazar.
 * Ana sayfa odağı ve uygulama ön plana gelince çağrılır.
 */
export async function syncPushTokenWithBackend(): Promise<void> {
  try {
    if (await isPushNotificationsOptedOut()) return;

    const token = await fetchExpoPushTokenIfGranted();
    if (!token) return;

    const ok = await registerPushTokenWithBackend(token);
    if (ok) await writePushNotificationsEnabled(true);
  } catch {
    /* sessiz */
  }
}

export async function enablePushNotifications(): Promise<boolean> {
  try {
    const token = await withTimeout(
      fetchExpoPushTokenWithPermissionRequest(),
      TOKEN_TIMEOUT_MS + 5_000,
    );
    if (!token) {
      await writePushNotificationsEnabled(false);
      return false;
    }
    const ok = await registerPushTokenWithBackend(token);
    if (!ok) {
      await writePushNotificationsEnabled(false);
      return false;
    }
    await writePushNotificationsEnabled(true);
    return true;
  } catch {
    await writePushNotificationsEnabled(false);
    return false;
  }
}

export async function disablePushNotifications(): Promise<void> {
  try {
    const token = await fetchExpoPushTokenIfGranted();
    if (token) await unregisterPushTokenFromBackend(token);
    await writePushNotificationsEnabled(false);
    await setAppIconBadge(0);
  } catch {
    try {
      await writePushNotificationsEnabled(false);
    } catch {
      /* sessiz */
    }
  }
}

export async function setAppIconBadge(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    /* badge desteklenmeyebilir */
  }
}

export { readPushNotificationsEnabled } from './pushNotificationPrefs';
