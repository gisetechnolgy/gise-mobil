import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';
import { useAuth } from '../app/context/AuthContext';

/**
 * Auth gerektiren ekranlarda kullanılır.
 *
 * Davranış:
 * - Bootstrap (`isLoading`) bittikten sonra kullanıcı yoksa
 *   ekran odaklandığında /(auth)/login'e yönlendirir.
 * - `redirectAfterLogin` verilirse giriş sonrası o rotaya dönülür.
 *
 * Çağıran ekran kendi loading/null UI'ını dönmelidir.
 */
export function useRequireAuth(redirectAfterLogin?: string): {
  isLoading: boolean;
  isAuthenticated: boolean;
} {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useFocusEffect(
    useCallback(() => {
      if (!isLoading && !isAuthenticated) {
        if (redirectAfterLogin) {
          router.replace({
            pathname: '/(auth)/login',
            params: { redirect: redirectAfterLogin },
          } as unknown as Href);
        } else {
          router.replace('/(auth)/login' as Href);
        }
      }
    }, [isLoading, isAuthenticated, router, redirectAfterLogin]),
  );

  return { isLoading, isAuthenticated };
}
