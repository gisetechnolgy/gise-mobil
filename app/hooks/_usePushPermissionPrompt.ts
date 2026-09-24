import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { maybePromptForPushNotifications } from '../../lib/pushPermissionPrompt';
import { syncPushTokenWithBackend } from '../../lib/push-notifications';

/** Giriş sonrası ilk bildirim izni + uygulama ön plana gelince token senkronu. */
export function usePushPermissionPrompt(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) return;

    void maybePromptForPushNotifications();

    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') void syncPushTokenWithBackend();
    };

    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [isAuthenticated]);
}
