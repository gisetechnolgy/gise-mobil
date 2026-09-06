import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AuthScreenLayout from '../components/AuthScreenLayout';
import { useAuth } from '../context/AuthContext';
import { AppColors } from '../../constants/colors';
import { AppText as Text } from '@/components/ui/AppText';

export default function SsoScreen() {
  const { loginWithSsoToken } = useAuth();
  const { token, redirect } = useLocalSearchParams<{
    token?: string | string[];
    redirect?: string | string[];
  }>();
  const ssoToken = typeof token === 'string' ? token : token?.[0];
  const redirectPath = typeof redirect === 'string' ? redirect : redirect?.[0];
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ssoToken) {
      setError('SSO token missing');
      return;
    }
    (async () => {
      try {
        await loginWithSsoToken(ssoToken);
        router.replace((redirectPath as Href) || ('/(tabs)' as Href));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'SSO login failed');
      }
    })();
  }, [ssoToken, redirectPath, loginWithSsoToken]);

  return (
    <AuthScreenLayout contentStyle={styles.content}>
      <View style={styles.block}>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <ActivityIndicator color={AppColors.navText} />
        )}
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center' },
  block: { alignItems: 'center', padding: 24 },
  error: { color: '#c00', textAlign: 'center' },
});
