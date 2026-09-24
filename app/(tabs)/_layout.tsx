import { View } from "react-native";
import { Tabs } from "expo-router";
import { AppColors } from "../../constants/colors";
import { useAuth } from "../context/AuthContext";
import { useNotificationsPanel } from "../context/NotificationContext";
import { usePushNotifications } from "../hooks/_usePushNotifications";
import { usePushPermissionPrompt } from "../hooks/_usePushPermissionPrompt";

export default function TabsLayout() {
  const { isAuthenticated } = useAuth();
  const { refreshUnreadCount } = useNotificationsPanel();

  usePushPermissionPrompt(isAuthenticated);

  usePushNotifications({
    isAuthenticated,
    onNotificationReceived: () => {
      void refreshUnreadCount();
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: AppColors.background }}>
      <Tabs
        tabBar={() => null}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="events" />
        <Tabs.Screen name="support" />
        <Tabs.Screen name="profile" />
        {/* Mekanlar hamburger menüden — tab bar’da yok */}
        <Tabs.Screen name="venues" options={{ href: null }} />
      </Tabs>
    </View>
  );
}
