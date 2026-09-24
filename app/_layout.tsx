import '../global.css';
import 'react-native-gesture-handler';
// Foreground push banner — tabs yuklenmeden once handler kaydi
import '../lib/pushNotificationHandler';

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  StyleSheet,
  Text,
  TextInput,
  type StyleProp,
  type TextStyle
} from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ForceUpdateScreen from './components/ForceUpdateScreen';
import { AppPanelsProvider } from './context/AppPanelsProvider';
import { AuthProvider } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import { LocaleProvider, useLocale } from './context/_LocaleContext';
import { applyRadioAudioSession } from '../lib/audioSession';
import { extractSaleIdFromPaymentUrl } from '../lib/garanti3dHtml';
import {
  resolveMandatoryUpdate,
  type UpdateRequirement,
} from '../lib/mandatoryUpdate';

// Initial route: `app/index.tsx` artık token kontrolü yapıp ya (tabs)'a ya da
// (auth)/login'e yönlendiriyor. Bu yüzden anchor'ı index'e çekiyoruz; eski
// '(tabs)' anchor'ı kullanıcının token'sız iken bile direkt ana ekrana
// düşmesine yol açıyordu.
export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PoppinsRegular: require('../assets/fonts/Poppins-Regular.ttf'),
    PoppinsMedium: require('../assets/fonts/Poppins-Medium.ttf'),
    PoppinsSemiBold: require('../assets/fonts/Poppins-SemiBold.ttf'),
    PoppinsBold: require('../assets/fonts/Poppins-Bold.ttf'),
  });
  const [appIsReady, setAppIsReady] = useState(false);
  const fontPatchAppliedRef = useRef(false);
  const [updateRequirement, setUpdateRequirement] =
    useState<UpdateRequirement>({ kind: 'none' });

  const prepareApp = useCallback(async () => {
    try {
      await SplashScreen.preventAutoHideAsync();
    } catch {
      /* Expo Go / dev: native splash yok */
    }

    try {
      const [requirement] = await Promise.all([
        resolveMandatoryUpdate(),
        applyRadioAudioSession().catch((e) => {
          console.warn('[audioSession] bootstrap failed:', e);
        }),
      ]);
      setUpdateRequirement(requirement);
    } catch (e) {
      console.warn('[prepareApp] bootstrap failed:', e);
      setUpdateRequirement({ kind: 'none' });
    }
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;

    if (!fontPatchAppliedRef.current) {
      const resolvePoppinsFamily = (style: StyleProp<TextStyle>): string => {
        const flattened = StyleSheet.flatten(style) ?? {};
        const explicitFamily = flattened.fontFamily ?? '';
        if (explicitFamily.includes('PoppinsBold')) return 'PoppinsBold';
        if (explicitFamily.includes('PoppinsSemiBold')) return 'PoppinsSemiBold';
        if (explicitFamily.includes('PoppinsMedium')) return 'PoppinsMedium';
        if (explicitFamily.includes('PoppinsRegular')) return 'PoppinsRegular';
        if (explicitFamily.includes('Poppins_700Bold')) return 'PoppinsBold';
        if (explicitFamily.includes('Poppins_600SemiBold')) return 'PoppinsSemiBold';
        if (explicitFamily.includes('Poppins_500Medium')) return 'PoppinsMedium';
        if (explicitFamily.includes('Poppins_400Regular')) return 'PoppinsRegular';

        const weightRaw = flattened.fontWeight;
        let weight = 400;
        if (typeof weightRaw === 'number') {
          weight = weightRaw;
        } else if (typeof weightRaw === 'string') {
          if (weightRaw === 'bold') weight = 700;
          else if (weightRaw === 'normal') weight = 400;
          else {
            const parsed = parseInt(weightRaw, 10);
            weight = Number.isFinite(parsed) ? parsed : 400;
          }
        }

        if (weight >= 700) return 'PoppinsBold';
        if (weight >= 600) return 'PoppinsSemiBold';
        if (weight >= 500) return 'PoppinsMedium';
        return 'PoppinsRegular';
      };

      const TextComponent = Text as typeof Text & {
        defaultProps?: { style?: StyleProp<TextStyle> };
        render?: (...args: unknown[]) => unknown;
      };
      const TextInputComponent = TextInput as typeof TextInput & {
        defaultProps?: { style?: StyleProp<TextStyle> };
        render?: (...args: unknown[]) => unknown;
      };

      TextComponent.defaultProps = {
        ...(TextComponent.defaultProps ?? {}),
        style: [{ fontFamily: 'PoppinsRegular' }, TextComponent.defaultProps?.style],
      };
      TextInputComponent.defaultProps = {
        ...(TextInputComponent.defaultProps ?? {}),
        style: [{ fontFamily: 'PoppinsRegular' }, TextInputComponent.defaultProps?.style],
      };

      const originalTextRender = TextComponent.render;
      if (originalTextRender) {
        TextComponent.render = (...args: unknown[]) => {
          const element = originalTextRender(...args) as {
            props: { style?: StyleProp<TextStyle> };
          };
          const style = (element.props as { style?: StyleProp<TextStyle> }).style;
          const family = resolvePoppinsFamily(style);
          return {
            ...element,
            props: {
              ...element.props,
              style: [style, { fontFamily: family, fontWeight: 'normal' as const }],
            },
          };
        };
      }

      const originalTextInputRender = TextInputComponent.render;
      if (originalTextInputRender) {
        TextInputComponent.render = (...args: unknown[]) => {
          const element = originalTextInputRender(...args) as {
            props: { style?: StyleProp<TextStyle> };
          };
          const style = (element.props as { style?: StyleProp<TextStyle> }).style;
          const family = resolvePoppinsFamily(style);
          return {
            ...element,
            props: {
              ...element.props,
              style: [style, { fontFamily: family, fontWeight: 'normal' as const }],
            },
          };
        };
      }

      fontPatchAppliedRef.current = true;
    }

    let cancelled = false;
    void (async () => {
      try {
        await prepareApp();
      } catch (e) {
        console.warn('[RootLayout] prepareApp failed:', e);
      } finally {
        if (!cancelled) setAppIsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fontsLoaded, prepareApp]);

  if (!fontsLoaded || !appIsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LocaleProvider>
          <RootNavigation updateRequirement={updateRequirement} setUpdateRequirement={setUpdateRequirement} />
        </LocaleProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigation({
  updateRequirement,
  setUpdateRequirement,
}: {
  updateRequirement: UpdateRequirement;
  setUpdateRequirement: (value: UpdateRequirement) => void;
}) {
  const { locale } = useLocale();
  const router = useRouter();

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      const sid = extractSaleIdFromPaymentUrl(url);
      if (!sid) return;
      if (
        url.includes('payment/result') ||
        url.includes('odeme-ozeti') ||
        url.startsWith('cocobongoloyalty:')
      ) {
        router.replace({
          pathname: '/events/payment/result',
          params: { sid },
        } as import('expo-router').Href);
      }
    };

    void Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (e) => handleUrl(e.url));
    return () => sub.remove();
  }, [router]);

  return (
    <BrandingProvider>
      <AuthProvider>
        <AppPanelsProvider>
          <ForceUpdateScreen
            requirement={updateRequirement}
            onRequirementChange={setUpdateRequirement}
          />
          <Stack
            key={locale}
            screenOptions={{
              gestureEnabled: true,
              // Tam ekran swipe back dikey scroll ile çakışıyor (özellikle detay sayfaları).
              // Geri jesti yalnızca sol kenardan çalışsın.
              fullScreenGestureEnabled: false,
              animation: 'none',
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(admin-tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen
              name="search"
              options={{
                headerShown: false,
                animation: 'none',
              }}
            />
            <Stack.Screen
              name="events/[id]"
              options={{
                headerShown: false,
                animation: 'none',
                gestureEnabled: true,
                fullScreenGestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="events/buy/[id]"
              options={{
                headerShown: false,
                animation: 'none',
                gestureEnabled: true,
                fullScreenGestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="events/payment/[id]"
              options={{
                headerShown: false,
                animation: 'none',
                gestureEnabled: true,
                fullScreenGestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="events/payment/result"
              options={{
                headerShown: false,
                animation: 'none',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="events/seats/[id]"
              options={{
                headerShown: false,
                animation: 'none',
                gestureEnabled: true,
                fullScreenGestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="admin/events/[id]"
              options={{
                headerShown: false,
                animation: 'none',
              }}
            />
            <Stack.Screen
              name="admin/events/stock-stats"
              options={{
                headerShown: false,
                animation: 'none',
              }}
            />
            <Stack.Screen
              name="admin/events/sales"
              options={{
                headerShown: false,
                animation: 'none',
              }}
            />
            <Stack.Screen
              name="admin/events/tickets"
              options={{
                headerShown: false,
                animation: 'none',
              }}
            />
            <Stack.Screen
              name="admin/events/stock-edit"
              options={{
                headerShown: false,
                animation: 'none',
              }}
            />
            <Stack.Screen
              name="admin/scan-qr"
              options={{
                headerShown: false,
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="venues/[id]"
              options={{
                headerShown: false,
                animation: 'none',
              }}
            />
            <Stack.Screen
              name="companies/[id]"
              options={{
                headerShown: false,
                animation: 'none',
              }}
            />
            <Stack.Screen
              name="modal"
              options={{ presentation: 'modal', title: 'Modal' }}
            />
        </Stack>
        <StatusBar style="dark" />
        </AppPanelsProvider>
      </AuthProvider>
    </BrandingProvider>
  );
}
