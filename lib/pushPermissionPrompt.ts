import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  enablePushNotifications,
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

    promptInFlight = true;
    await writePushPermissionPromptShown();
    await enablePushNotifications();
  } finally {
    promptInFlight = false;
  }
}
