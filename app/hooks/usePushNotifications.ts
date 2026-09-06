import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { getNotificationHrefFromPushData } from '../../lib/notificationNavigation';
import { syncPushTokenWithBackend } from '../../lib/push-notifications';

type Options = {
  isAuthenticated: boolean;
  onNotificationReceived?: () => void;
};

export function usePushNotifications({
  isAuthenticated,
  onNotificationReceived,
}: Options) {
  const router = useRouter();
  const onReceivedRef = useRef(onNotificationReceived);
  onReceivedRef.current = onNotificationReceived;

  useEffect(() => {
    if (!isAuthenticated) return;

    void syncPushTokenWithBackend();

    let receivedSub: Notifications.EventSubscription | undefined;
    let responseSub: Notifications.EventSubscription | undefined;

    try {
      receivedSub = Notifications.addNotificationReceivedListener(() => {
        try {
          onReceivedRef.current?.();
        } catch {
          /* sessiz */
        }
      });

      responseSub = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          try {
            const data = response.notification.request.content.data as
              | Record<string, unknown>
              | undefined;
            const href = getNotificationHrefFromPushData(data);
            if (href) router.push(href);
            onReceivedRef.current?.();
          } catch {
            /* sessiz */
          }
        },
      );
    } catch {
      return;
    }

    void Notifications.getLastNotificationResponseAsync()
      .then((last) => {
        if (!last) return;
        try {
          const data = last.notification.request.content.data as
            | Record<string, unknown>
            | undefined;
          const href = getNotificationHrefFromPushData(data);
          if (href) router.push(href as Href);
        } catch {
          /* sessiz */
        }
      })
      .catch(() => {
        /* sessiz */
      });

    return () => {
      receivedSub?.remove();
      responseSub?.remove();
    };
  }, [isAuthenticated, router]);
}
