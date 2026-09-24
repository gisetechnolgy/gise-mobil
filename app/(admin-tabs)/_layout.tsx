import { useEffect } from "react";
import { View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { AppColors } from "../../constants/colors";
import { useAuth } from "../context/AuthContext";

export default function AdminTabsLayout() {
  const router = useRouter();
  const { user } = useAuth();
  const canAccess = !!user?.isSaleMode;

  useEffect(() => {
    if (!user) return;
    if (!user.isSaleMode) {
      router.replace("/(tabs)");
    }
  }, [user, router]);

  if (!canAccess) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: AppColors.navBg }}>
      <Tabs
        tabBar={() => null}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen name="events" />
        <Tabs.Screen name="scan" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </View>
  );
}
