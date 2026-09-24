import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Expo Go (SDK 53+): Android remote push desteklenmiyor; paketi import etmek
 * DevicePushTokenAutoRegistration yüzünden kırmızı ERROR basıyor.
 * Dev/production client'ta normal çalışır.
 */
export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Remote push token / listener — Expo Go Android'de kullanma. */
export const canUseRemotePush =
  Platform.OS !== 'web' && !(isExpoGo && Platform.OS === 'android');

export type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

/** Expo Go Android'de null; aksi halde expo-notifications. */
export function getNotifications(): NotificationsModule | null {
  if (!canUseRemotePush) return null;
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
    return cached;
  } catch {
    cached = null;
    return null;
  }
}
