import { useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, Animated, Easing, Linking } from "react-native";
import DrawerMenu from "../components/DrawerMenu";
import NotificationDrawer from "../components/NotificationDrawer";
import PersistentTabBar from "../components/PersistentTabBar";
import { useAuth } from "./AuthContext";
import { DrawerContext } from "./DrawerContext";
import { NotificationContext } from "./NotificationContext";
import { useTranslation } from "./_LocaleContext";
import { fetchUnreadCount } from "../../lib/notifications";
import {
  enablePushNotifications,
  promptNotificationPermissionOnOpen,
  setAppIconBadge,
  syncPushTokenWithBackend,
} from "../../lib/push-notifications";

/**
 * Hamburger + bildirim panelleri — tüm stack/tab ekranlarında çalışsın diye
 * root'ta tutulur (sadece (tabs) içinde olursa mekan/org sayfalarında no-op kalır).
 */
export function AppPanelsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current;

  const [notifVisible, setNotifVisible] = useState(false);
  const notifAnim = useRef(new Animated.Value(0)).current;

  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetchUnreadCount();
      setUnreadCount(res.unreadCount);
      await setAppIconBadge(res.unreadCount);
    } catch {
      /* ignore */
    }
  }, [isAuthenticated]);

  const refreshNotifications = useCallback(async () => {
    await refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!isAuthenticated) {
      void setAppIconBadge(0);
      return;
    }
    void syncPushTokenWithBackend();
    void refreshUnreadCount();
    const id = setInterval(() => {
      void refreshUnreadCount();
    }, 30_000);
    return () => clearInterval(id);
  }, [isAuthenticated, refreshUnreadCount]);

  const closeNotifications = useCallback(() => {
    Animated.timing(notifAnim, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setNotifVisible(false);
    });
  }, [notifAnim]);

  const closeDrawer = useCallback(() => {
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setDrawerVisible(false);
    });
  }, [drawerAnim]);

  const openDrawer = useCallback(() => {
    if (notifVisible) closeNotifications();
    setDrawerVisible(true);
    drawerAnim.setValue(0);
    Animated.timing(drawerAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [closeNotifications, drawerAnim, notifVisible]);

  const openNotifications = useCallback(() => {
    if (drawerVisible) closeDrawer();

    const showPanel = () => {
      setNotifVisible(true);
      notifAnim.setValue(0);
      Animated.timing(notifAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        void refreshUnreadCount();
      }, 300);
    };

    void (async () => {
      const result = await promptNotificationPermissionOnOpen();
      if (result.granted) {
        void enablePushNotifications();
      } else {
        Alert.alert(t("notifications"), t("notificationsPermissionDenied"), [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("openSettings"),
            onPress: () => {
              void Linking.openSettings();
            },
          },
        ]);
      }
      showPanel();
    })();
  }, [closeDrawer, drawerVisible, notifAnim, refreshUnreadCount, t]);

  const handleDrawerNavigate = useCallback(
    (payload: {
      type: "route" | "page" | "corporate";
      href?: string;
      pageId?: string;
      slug?: string;
    }) => {
      if (payload.type === "route" && payload.href) {
        router.push(payload.href as Href);
        return;
      }
      if (payload.type === "page" && payload.pageId) {
        router.push(`/pages/${payload.pageId}` as Href);
        return;
      }
      if (payload.type === "corporate" && payload.slug) {
        router.push(`/corporate/${payload.slug}` as Href);
      }
    },
    [router],
  );

  const drawerValue = useMemo(
    () => ({
      isOpen: drawerVisible,
      pushAnim: drawerAnim,
      openDrawer,
      closeDrawer,
    }),
    [closeDrawer, drawerAnim, drawerVisible, openDrawer],
  );

  const notifValue = useMemo(
    () => ({
      isOpen: notifVisible,
      pushAnim: notifAnim,
      unreadCount,
      openNotifications,
      closeNotifications,
      refreshUnreadCount,
      refreshNotifications,
    }),
    [
      closeNotifications,
      notifAnim,
      notifVisible,
      openNotifications,
      refreshNotifications,
      refreshUnreadCount,
      unreadCount,
    ],
  );

  return (
    <DrawerContext.Provider value={drawerValue}>
      <NotificationContext.Provider value={notifValue}>
        {children}
        <PersistentTabBar />
        <DrawerMenu
          modalVisible={drawerVisible}
          pushAnim={drawerAnim}
          onClose={closeDrawer}
          onNavigate={handleDrawerNavigate}
        />
        <NotificationDrawer
          modalVisible={notifVisible}
          pushAnim={notifAnim}
          onClose={closeNotifications}
        />
      </NotificationContext.Provider>
    </DrawerContext.Provider>
  );
}

export default function AppPanelsProviderRoute() {
  return null;
}
