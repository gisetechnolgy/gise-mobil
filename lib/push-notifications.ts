import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { PermissionsAndroid, Platform } from 'react-native';
import { api } from './api';
import { getNotifications } from './expoNotificationsSafe';
import { ensurePushNotificationHandler } from './pushNotificationHandler';
import {
  isPushNotificationsOptedOut,
  readPushNotificationsEnabled,
  writePushNotificationsEnabled,
} from './pushNotificationPrefs';
import { secureStorage } from './secureStorage';

const Notifications = getNotifications();
ensurePushNotificationHandler();

function androidApiLevel(): number {
  return typeof Platform.Version === 'number'
    ? Platform.Version
    : parseInt(String(Platform.Version), 10) || 0;
}

/**
 * Android 13+: POST_NOTIFICATIONS sistem diyaloğu.
 * Expo Go'da expo-notifications kapalı olduğu için PermissionsAndroid kullanıyoruz.
 */
async function requestAndroidNotificationPermission(): Promise<{
  granted: boolean;
  canOpenSettings: boolean;
} | null> {
  if (Platform.OS !== 'android') return null;

  if (androidApiLevel() < 33) {
    return { granted: true, canOpenSettings: false };
  }

  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (!permission) {
    return { granted: false, canOpenSettings: false };
  }

  try {
    const already = await PermissionsAndroid.check(permission);
    if (already) return { granted: true, canOpenSettings: false };

    // Native sistem popup (Kotlin/Java PermissionsAndroid bridge)
    const result = await PermissionsAndroid.request(permission);
    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      return { granted: true, canOpenSettings: false };
    }
    // NEVER_ASK_AGAIN → OS bir daha sormaz; aksi halde sonraki açılışta tekrar popup
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      return { granted: false, canOpenSettings: true };
    }
    return { granted: false, canOpenSettings: false };
  } catch {
    return { granted: false, canOpenSettings: false };
  }
}

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
  if (!Notifications || Platform.OS !== 'android') return;
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
  const result = await promptNotificationPermissionOnOpen();
  return result.granted;
}

/**
 * Bildirim paneli açılırken: mümkünse her seferinde OS sistem popup'ını sor.
 * Ayarlar yalnızca OS "bir daha sorma" dediyse (canAskAgain === false).
 */
export async function promptNotificationPermissionOnOpen(): Promise<{
  granted: boolean;
  canOpenSettings: boolean;
}> {
  try {
    if (Platform.OS === 'android') {
      const androidResult = await requestAndroidNotificationPermission();
      if (androidResult) {
        if (androidResult.granted && Notifications) {
          try {
            await Notifications.requestPermissionsAsync();
          } catch {
            /* opsiyonel */
          }
        }
        return androidResult;
      }
    }

    if (!Notifications) {
      return { granted: false, canOpenSettings: false };
    }

    const current = await Notifications.getPermissionsAsync();
    const iosStatus = current.ios?.status;
    const alreadyGranted =
      current.granted === true ||
      current.status === 'granted' ||
      iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL;

    if (alreadyGranted) {
      return { granted: true, canOpenSettings: false };
    }

    // OS popup'ı açılamıyorsa (daha önce kalıcı red) → ayarlar
    if (
      current.status === 'denied' &&
      current.canAskAgain === false
    ) {
      return { granted: false, canOpenSettings: true };
    }

    // iOS: UNUserNotificationCenter.requestAuthorization (Swift bridge)
    const next = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    const nextIos = next.ios?.status;
    const granted =
      next.granted === true ||
      next.status === 'granted' ||
      nextIos === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      nextIos === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      nextIos === Notifications.IosAuthorizationStatus.EPHEMERAL;

    if (granted) {
      return { granted: true, canOpenSettings: false };
    }

    return {
      granted: false,
      canOpenSettings: next.canAskAgain === false,
    };
  } catch {
    return { granted: false, canOpenSettings: false };
  }
}

/** İzin verilmişse Expo push token döner; izin istemez. */
export async function fetchExpoPushTokenIfGranted(): Promise<string | null> {
  if (!Notifications) return null;
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
  if (!Notifications) return null;
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
    // Profil anahtarı / ayarlar: önce OS sistem popup'ı (Expo Go Android dahil)
    const perm = await promptNotificationPermissionOnOpen();
    if (!perm.granted) {
      await writePushNotificationsEnabled(false);
      return false;
    }

    // İzin var — remote token opsiyonel (Expo Go Android'de Notifications yok)
    if (!Notifications) {
      await writePushNotificationsEnabled(true);
      return true;
    }

    if (!Device.isDevice) {
      await writePushNotificationsEnabled(true);
      return true;
    }

    try {
      const token = await withTimeout(
        fetchExpoPushTokenIfGranted(),
        TOKEN_TIMEOUT_MS,
      );
      if (token) {
        await registerPushTokenWithBackend(token);
      }
    } catch {
      /* token alınamazsa bile OS izni var — anahtar açık kalsın */
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
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    /* badge desteklenmeyebilir */
  }
}

export { readPushNotificationsEnabled } from './pushNotificationPrefs';
