import { PermissionsAndroid, Platform } from 'react-native';
import { getNotifications } from './expoNotificationsSafe';
import {
  enablePushNotifications,
  promptNotificationPermissionOnOpen,
  syncPushTokenWithBackend,
} from './push-notifications';
import {
  isPushNotificationsOptedOut,
  readPushPermissionPromptShown,
  writePushPermissionPromptShown,
} from './pushNotificationPrefs';

let promptInFlight = false;

/**
 * İlk girişte bir kez sistem bildirim iznini ister; izin verilirse token backend'e kaydedilir.
 */
export async function maybePromptForPushNotifications(): Promise<void> {
  if (promptInFlight) return;
  if (Platform.OS === 'web') return;

  try {
    if (await isPushNotificationsOptedOut()) return;
    if (await readPushPermissionPromptShown()) {
      await syncPushTokenWithBackend();
      return;
    }

    const Notifications = getNotifications();
    if (Notifications) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        await writePushPermissionPromptShown();
        await syncPushTokenWithBackend();
        return;
      }
      if (status === 'denied') {
        await writePushPermissionPromptShown();
        return;
      }
    } else if (Platform.OS === 'android') {
      // Expo Go Android: expo-notifications yok — yine de OS iznini sor
      const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
      if (permission) {
        const already = await PermissionsAndroid.check(permission);
        if (already) {
          await writePushPermissionPromptShown();
          return;
        }
      }
    }

    promptInFlight = true;
    await writePushPermissionPromptShown();
    const { granted } = await promptNotificationPermissionOnOpen();
    if (granted) {
      await enablePushNotifications();
    }
  } finally {
    promptInFlight = false;
  }
}
