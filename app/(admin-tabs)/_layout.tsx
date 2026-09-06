import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { AppColors } from "../../constants/colors";
import FloatingTabBar from "../components/FloatingTabBar";
import { useAuth } from "../context/AuthContext";
import { canExitAdminMode } from "../../lib/roles";

export default function AdminTabsLayout() {
  const router = useRouter();
  const { user, setManagerSaleMode } = useAuth();
  const notifAnim = useRef(new Animated.Value(0)).current;
  const [busy, setBusy] = useState(false);

  const canAccess = !!user?.isSaleMode;

  useEffect(() => {
    if (!user) return;
    if (!user.isSaleMode) {
      router.replace("/(tabs)");
    }
  }, [user, router]);

  const exitAdminMode = useCallback(async () => {
    if (
      busy ||
      !user ||
      !canExitAdminMode({ crole: user.crole, isSalePoint: user.isSalePoint })
    ) {
      return;
    }
    setBusy(true);
    try {
      await setManagerSaleMode(false);
      router.replace("/(tabs)");
    } finally {
      setBusy(false);
    }
  }, [busy, router, setManagerSaleMode, user]);

  if (!canAccess) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: AppColors.navBg }}>
      <Tabs
        tabBar={(props) => (
          <FloatingTabBar
            {...props}
            variant="admin"
            notifAnim={notifAnim}
            onUserModePress={() => {
              void exitAdminMode();
            }}
            showUserModeExit={
              !!user &&
              canExitAdminMode({ crole: user.crole, isSalePoint: user.isSalePoint })
            }
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
        <Tabs.Screen name="events" />
        <Tabs.Screen name="scan" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </View>
  );
}
