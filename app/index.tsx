import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useAuth } from './context/AuthContext';

/**
 * Uygulama açılış route'u — giriş yoksa önce login; login'deki
 * "Misafir olarak devam et" ana ekrana geçirir.
 */
export default function IndexRoute() {
  const { isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading || !user?.isSaleMode) return;
    void SplashScreen.hideAsync().catch(() => {
      /* Splash zaten gizli olabilir */
    });
  }, [isLoading, user?.isSaleMode]);

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.isSaleMode) {
    return <Redirect href="/(admin-tabs)/events" />;
  }

  return <Redirect href="/(tabs)" />;
}
