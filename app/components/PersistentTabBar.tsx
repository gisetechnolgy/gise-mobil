import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { usePathname, useRouter, useSegments, type Href } from "expo-router";
import { useCallback, useState } from "react";
import {
  Animated,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColors } from "../../constants/colors";
import {
  resolveAdminActiveTab,
  resolveConsumerActiveTab,
  shouldShowAppTabBar,
} from "../../lib/tabBarVisibility";
import {
  getScreenHorizontalInset,
  HOME_CARD_BORDER_RADIUS,
  useIsTablet,
} from "../../lib/responsive";
import { canExitAdminMode, usesAdminModeToggle } from "../../lib/roles";
import { useAuth } from "../context/AuthContext";
import { useDrawer } from "../context/DrawerContext";
import { useNotificationsPanel } from "../context/NotificationContext";
import { useTranslation } from "../context/_LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";

type TabConfig = {
  iconFamily?: "ionicons" | "material";
  icon: string;
  labelKey:
    | "home"
    | "events"
    | "support"
    | "profile"
    | "scanTicket"
    | "admin"
    | "userMode";
};

const CONSUMER_TABS: { name: string; href: Href; config: TabConfig }[] = [
  {
    name: "index",
    href: "/(tabs)" as Href,
    config: { iconFamily: "ionicons", icon: "home", labelKey: "home" },
  },
  {
    name: "events",
    href: "/(tabs)/events" as Href,
    config: { iconFamily: "ionicons", icon: "calendar", labelKey: "events" },
  },
  {
    name: "support",
    href: "/(tabs)/support" as Href,
    config: {
      iconFamily: "ionicons",
      icon: "help-circle",
      labelKey: "support",
    },
  },
  {
    name: "profile",
    href: "/(tabs)/profile" as Href,
    config: { iconFamily: "ionicons", icon: "person", labelKey: "profile" },
  },
];

const ADMIN_TABS: { name: string; href: Href; config: TabConfig }[] = [
  {
    name: "events",
    href: "/(admin-tabs)/events" as Href,
    config: { iconFamily: "ionicons", icon: "calendar", labelKey: "events" },
  },
  {
    name: "scan",
    href: "/(admin-tabs)/scan" as Href,
    config: { iconFamily: "ionicons", icon: "qr-code", labelKey: "scanTicket" },
  },
  {
    name: "profile",
    href: "/(admin-tabs)/profile" as Href,
    config: { iconFamily: "ionicons", icon: "person", labelKey: "profile" },
  },
];

function TabIcon({
  config,
  iconSize,
  iconColor,
}: {
  config: TabConfig;
  iconSize: number;
  iconColor: string;
}) {
  if (config.iconFamily === "material") {
    return (
      <MaterialCommunityIcons
        name={config.icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={iconSize}
        color={iconColor}
      />
    );
  }
  return (
    <Ionicons
      name={config.icon as keyof typeof Ionicons.glyphMap}
      size={iconSize}
      color={iconColor}
    />
  );
}

/**
 * Root seviyesinde sabit tab bar — iç/detay sayfalarında gizlenir,
 * liste ve ana ekranlarda her yerde görünür.
 */
export default function PersistentTabBar() {
  const pathname = usePathname();
  const segments = useSegments();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { t } = useTranslation();
  const { user, setManagerSaleMode } = useAuth();
  const { pushAnim: drawerAnim } = useDrawer();
  const { pushAnim: notifAnim } = useNotificationsPanel();
  const [roleBusy, setRoleBusy] = useState(false);

  const visible = shouldShowAppTabBar(pathname, segments as string[]);
  const isAdminMode = !!user?.isSaleMode;
  const showAdminEntry = !!user?.canEnterAdminMode && !user.isSaleMode;
  const showUserModeExit =
    !!user &&
    canExitAdminMode({ crole: user.crole, isSalePoint: user.isSalePoint });

  const activeTab = isAdminMode
    ? resolveAdminActiveTab(pathname, segments as string[])
    : resolveConsumerActiveTab(pathname, segments as string[]);

  const tabs = isAdminMode ? ADMIN_TABS : CONSUMER_TABS;

  const enterAdminMode = useCallback(async () => {
    if (roleBusy || !user?.canEnterAdminMode) return;
    setRoleBusy(true);
    try {
      if (usesAdminModeToggle(user.crole)) {
        await setManagerSaleMode(true);
      }
      router.replace("/(admin-tabs)/events" as Href);
    } finally {
      setRoleBusy(false);
    }
  }, [roleBusy, router, setManagerSaleMode, user]);

  const exitAdminMode = useCallback(async () => {
    if (roleBusy || !user || !showUserModeExit) return;
    setRoleBusy(true);
    try {
      await setManagerSaleMode(false);
      router.replace("/(tabs)" as Href);
    } finally {
      setRoleBusy(false);
    }
  }, [roleBusy, router, setManagerSaleMode, showUserModeExit, user]);

  if (!visible) return null;

  const bottomOffset = Math.max(insets.bottom, 12) + 8;
  const barHeight = isTablet ? 82 : 68;
  const sideInset = getScreenHorizontalInset(isTablet);
  const iconSize = isTablet ? 30 : 25;
  const labelSize = isTablet ? 12 : 10;

  const showRoleSwitcher = isAdminMode ? showUserModeExit : showAdminEntry;
  const roleConfig: TabConfig = isAdminMode
    ? { iconFamily: "ionicons", icon: "swap-horizontal", labelKey: "userMode" }
    : { iconFamily: "ionicons", icon: "people", labelKey: "admin" };

  const barShadow = Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.22,
      shadowRadius: 20,
    },
    android: { elevation: 20 },
    default: {
      boxShadow:
        "0 10px 15px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
    },
  });

  const drawerOpacity = drawerAnim.interpolate({
    inputRange: [0, 0.25],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const notifOpacity = notifAnim.interpolate({
    inputRange: [0, 0.25],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const opacity = Animated.multiply(drawerOpacity, notifOpacity);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: bottomOffset,
        left: sideInset,
        right: sideInset,
        height: barHeight,
        opacity,
        zIndex: 100,
        elevation: 100,
      }}
    >
      <View
        style={[
          {
            flex: 1,
            borderRadius: HOME_CARD_BORDER_RADIUS,
            flexDirection: "row",
            alignItems: "stretch",
            backgroundColor: "#0E1F58",
            overflow: "hidden",
          },
          barShadow,
        ]}
      >
        {tabs.map((tab) => {
          const isFocused = activeTab === tab.name;
          const iconColor = isFocused
            ? AppColors.navText
            : "rgba(255, 255, 255, 0.45)";
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => {
                if (!isFocused) router.replace(tab.href);
              }}
              activeOpacity={0.7}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
              }}
            >
              <TabIcon
                config={tab.config}
                iconSize={iconSize}
                iconColor={iconColor}
              />
              <Text
                style={{
                  color: iconColor,
                  fontSize: labelSize,
                  fontFamily: "PoppinsSemiBold",
                }}
                numberOfLines={1}
              >
                {t(tab.config.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}

        {showRoleSwitcher ? (
          <TouchableOpacity
            onPress={() => {
              if (isAdminMode) void exitAdminMode();
              else void enterAdminMode();
            }}
            activeOpacity={0.85}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              backgroundColor: AppColors.accent,
            }}
            accessibilityRole="button"
            accessibilityLabel={t(roleConfig.labelKey)}
          >
            <TabIcon
              config={roleConfig}
              iconSize={iconSize}
              iconColor={AppColors.navText}
            />
            <Text
              style={{
                color: AppColors.navText,
                fontSize: labelSize,
                fontFamily: "PoppinsSemiBold",
              }}
              numberOfLines={1}
            >
              {t(roleConfig.labelKey)}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
}
