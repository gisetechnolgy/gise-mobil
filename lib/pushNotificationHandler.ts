import { getNotifications } from './expoNotificationsSafe';

/**
 * Uygulama acikken (foreground) remote push'in banner olarak gorunmesi icin
 * setNotificationHandler en basta kayitli olmali — tabs import'una birakma.
 */
export function ensurePushNotificationHandler(): void {
  const Notifications = getNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

ensurePushNotificationHandler();
