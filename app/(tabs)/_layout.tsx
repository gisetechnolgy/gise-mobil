import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Tabs, useRouter, type Href } from "expo-router";
import { AppColors } from "../../constants/colors";
import { fetchUnreadCount } from "../../lib/notifications";
import { setAppIconBadge, syncPushTokenWithBackend } from "../../lib/push-notifications";
import { DrawerContext } from "../context/DrawerContext";
import { NotificationContext } from "../context/NotificationContext";
import DrawerMenu, { DRAWER_WIDTH } from "../components/DrawerMenu";
import NotificationDrawer, {
  NOTIF_DRAWER_WIDTH,
} from "../components/NotificationDrawer";
import FloatingTabBar from "../components/FloatingTabBar";
import { useAuth } from "../context/AuthContext";
import { usesAdminModeToggle } from "../../lib/roles";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { usePushPermissionPrompt } from "../hooks/usePushPermissionPrompt";

export default function TabsLayout() {
  const router = useRouter();
  const { isAuthenticated, user, setManagerSaleMode } = useAuth();
  const [adminBusy, setAdminBusy] = useState(false);

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

  usePushPermissionPrompt(isAuthenticated);

  usePushNotifications({
    isAuthenticated,
    onNotificationReceived: () => {
      void refreshUnreadCount();
    },
  });

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

  const openDrawer = () => {
    if (notifVisible) closeNotifications();
    setDrawerVisible(true);
    Animated.timing(drawerAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setDrawerVisible(false);
    });
  };

  const openNotifications = () => {
    if (drawerVisible) closeDrawer();
    setNotifVisible(true);
    Animated.timing(notifAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      void refreshUnreadCount();
    }, 320);
  };

  const closeNotifications = () => {
    Animated.timing(notifAnim, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setNotifVisible(false);
    });
  };

  const drawerShift = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, DRAWER_WIDTH],
  });

  const notifShift = notifAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -NOTIF_DRAWER_WIDTH],
  });

  const contentTranslateX = Animated.add(drawerShift, notifShift);

  const panelOpen = Animated.add(drawerAnim, notifAnim);
  const scrimOpacity = panelOpen.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
    extrapolate: "clamp",
  });

  const handleDrawerNavigate = (id: string) => {
    const routeMap: Record<string, Href> = {
      news: "/news" as Href,
      corporate: "/corporate" as Href,
      salesPartner: "/sales-partner" as Href,
      managerEvents: "/(admin-tabs)/events" as Href,
    };

    const target = routeMap[id];
    if (target) {
      router.push(target);
    }
  };

  const enterAdminMode = useCallback(async () => {
    if (adminBusy || !user?.canEnterAdminMode) return;
    setAdminBusy(true);
    try {
      if (user && usesAdminModeToggle(user.crole)) {
        await setManagerSaleMode(true);
      }
      router.replace("/(admin-tabs)/events");
    } finally {
      setAdminBusy(false);
    }
  }, [adminBusy, router, setManagerSaleMode, user]);

  const showAdminEntry = !!user?.canEnterAdminMode && !user.isSaleMode;

  return (
    <DrawerContext.Provider
      value={{
        isOpen: drawerVisible,
        pushAnim: drawerAnim,
        openDrawer,
        closeDrawer,
      }}
    >
      <NotificationContext.Provider
        value={{
          isOpen: notifVisible,
          pushAnim: notifAnim,
          unreadCount,
          openNotifications,
          closeNotifications,
          refreshUnreadCount,
          refreshNotifications,
        }}
      >
        <View style={{ flex: 1, backgroundColor: AppColors.background }}>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.panelScrim,
              { opacity: scrimOpacity },
            ]}
          />
          <Animated.View
            style={{ flex: 1, transform: [{ translateX: contentTranslateX }] }}
          >
            <Tabs
              tabBar={(props) => (
                <FloatingTabBar
                  {...props}
                  variant="consumer"
                  showAdminEntry={showAdminEntry}
                  onAdminPress={() => {
                    void enterAdminMode();
                  }}
                  drawerAnim={drawerAnim}
                  notifAnim={notifAnim}
                />
              )}
              screenOptions={{
                headerShown: false,
                tabBarStyle: {
                  position: "absolute",
                  backgroundColor: "transparent",
                  borderTopWidth: 0,
                  elevation: 0,
                  shadowOpacity: 0,
                  overflow: "visible",
                },
              }}
            >
              <Tabs.Screen name="index" />
              <Tabs.Screen name="events" />
              <Tabs.Screen name="venues" />
              <Tabs.Screen name="profile" />
            </Tabs>
          </Animated.View>

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
        </View>
      </NotificationContext.Provider>
    </DrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  panelScrim: {
    backgroundColor: "#000",
    zIndex: 0,
  },
});
