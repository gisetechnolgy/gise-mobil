import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { usePathname, useRouter, useSegments, type Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColors } from "../../constants/colors";
import { PAGE_GUTTER, SECTION_BG, SOFT_SHADOW } from "../../constants/homeSection";

/** Tab bar altı sis: barın ortasından başlar, aşağı indikçe yoğunlaşır */
const FOG_TRANSPARENT = "rgba(243, 244, 246, 0)";
const FOG_DENSE = "rgba(243, 244, 246, 0.6)";
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

/** assets/icons/Destek.svg */
const SUPPORT_ICON_PATH =
  "M511.9,256C511.9,114.9,397.1,0.1,256,0.1S0.1,114.9,0.1,256c0,46,12.2,90.8,35.5,130.1L1,511l124.9-34.5c39.3,23.2,84.1,35.5,130.1,35.5C397.1,511.9,511.9,397.1,511.9,256z M216.7,196.4h-39.3c0-43.3,35.2-78.5,78.5-78.5s78.5,35.2,78.5,78.5c0,22-9.3,43.1-25.5,58l-33.4,30.5v30.6h-39.3v-47.9l46.1-42.2c8.2-7.5,12.8-17.8,12.8-29c0-21.7-17.6-39.3-39.3-39.3S216.7,174.8,216.7,196.4z M236.3,354.8h39.3v39.3h-39.3V354.8z";

type TabConfig = {
  iconFamily?: "ionicons" | "material" | "support";
  icon: string;
  labelKey: "home" | "events" | "support" | "profile" | "scanTicket" | "myTickets";
};

type TabDef = {
  name: string;
  href: Href;
  config: TabConfig;
  /** Ortadaki vurgulu (yuvarlak) buton */
  center?: boolean;
  /** İkon boyutuna eklenecek px (görsel olarak küçük kalan ikonlar için) */
  iconBoost?: number;
};

const CONSUMER_TABS: TabDef[] = [
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
    name: "tickets",
    href: "/tickets" as Href,
    config: { iconFamily: "ionicons", icon: "qr-code", labelKey: "myTickets" },
    center: true,
  },
  {
    name: "support",
    href: "/(tabs)/support" as Href,
    config: {
      iconFamily: "support",
      icon: "support",
      labelKey: "support",
    },
  },
  {
    name: "profile",
    href: "/(tabs)/profile" as Href,
    config: { iconFamily: "ionicons", icon: "person", labelKey: "profile" },
  },
];

const ADMIN_TABS: TabDef[] = [
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
  if (config.iconFamily === "support") {
    return (
      <Svg width={iconSize} height={iconSize} viewBox="0 0 512 512">
        <Path d={SUPPORT_ICON_PATH} fill={iconColor} />
      </Svg>
    );
  }
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
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    setRoleMenuOpen(false);
  }, [pathname]);

  const visible = shouldShowAppTabBar(pathname, segments as string[]);
  const isAdminMode = !!user?.isSaleMode;
  const canEnterAdmin = !!user?.canEnterAdminMode;
  const canExitAdmin =
    !!user &&
    canExitAdminMode({ crole: user.crole, isSalePoint: user.isSalePoint });
  /** Rol seçici: hem kullanıcı hem admin tarafına geçebilen hesaplar */
  const hasRolePicker = isAdminMode ? canExitAdmin : canEnterAdmin;

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
      setRoleMenuOpen(false);
    }
  }, [roleBusy, router, setManagerSaleMode, user]);

  const exitAdminMode = useCallback(async () => {
    if (roleBusy || !user || !canExitAdmin) return;
    setRoleBusy(true);
    try {
      await setManagerSaleMode(false);
      router.replace("/(tabs)" as Href);
    } finally {
      setRoleBusy(false);
      setRoleMenuOpen(false);
    }
  }, [roleBusy, router, setManagerSaleMode, canExitAdmin, user]);

  if (!visible || keyboardOpen) return null;

  const bottomOffset = Math.max(insets.bottom, 12) + 8;
  const barHeight = isTablet ? 82 : 68;
  /** Kartlarla aynı yan boşluk */
  const sideInset = isTablet ? getScreenHorizontalInset(true) : PAGE_GUTTER;
  const iconSize = isTablet ? 30 : 25;
  const labelSize = isTablet ? 12 : 10;
  const centerSize = isTablet ? 70 : 60;
  /** Tüm sekmelerde ikon alanı aynı → etiketler tek hizada */
  const iconSlot = iconSize + 6;
  /** QR dairesi barın üst kenarından taşar */
  const centerLift = isTablet ? 17 : 14;

  const barShadow = SOFT_SHADOW;

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

  const onTabPress = (tab: TabDef, isFocused: boolean) => {
    if (tab.name === "profile" && hasRolePicker) {
      setRoleMenuOpen((open) => !open);
      return;
    }
    setRoleMenuOpen(false);
    if (tab.name === "tickets" && !user) {
      router.push("/(auth)/login" as Href);
      return;
    }
    if (!isFocused) router.replace(tab.href);
  };

  const roleOptions = [
    {
      key: "user",
      icon: "person" as const,
      label: t("roleUser"),
      active: !isAdminMode,
      onPress: () => {
        if (isAdminMode) void exitAdminMode();
        else {
          setRoleMenuOpen(false);
          router.replace("/(tabs)/profile" as Href);
        }
      },
    },
    {
      key: "admin",
      icon: "people" as const,
      label: t("roleAdmin"),
      active: isAdminMode,
      onPress: () => {
        if (!isAdminMode) void enterAdminMode();
        else {
          setRoleMenuOpen(false);
          router.replace("/(admin-tabs)/profile" as Href);
        }
      },
    },
  ];

  return (
    <>
      {roleMenuOpen ? (
        <Pressable
          style={[StyleSheet.absoluteFill, { zIndex: 99, elevation: 99 }]}
          onPress={() => setRoleMenuOpen(false)}
        />
      ) : null}

      {roleMenuOpen ? (
        <View
          style={[
            styles.roleMenu,
            barShadow,
            {
              bottom: bottomOffset + barHeight + 10,
              right: sideInset,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              setRoleMenuOpen(false);
              router.replace(
                (isAdminMode
                  ? "/(admin-tabs)/profile"
                  : "/(tabs)/profile") as Href,
              );
            }}
            disabled={roleBusy}
            activeOpacity={0.75}
            style={styles.roleRow}
          >
            <View style={styles.roleIconWrap}>
              <Ionicons
                name="person-circle-outline"
                size={20}
                color={AppColors.heading}
              />
            </View>
            <Text style={styles.roleLabel} numberOfLines={1}>
              {t("profile")}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color="rgba(0,0,0,0.35)"
            />
          </TouchableOpacity>

          <View style={styles.roleMenuDivider} />

          <Text style={styles.roleMenuTitle}>{t("roleSwitchTitle")}</Text>
          {roleOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={opt.onPress}
              disabled={roleBusy}
              activeOpacity={0.75}
              style={[styles.roleRow, opt.active && styles.roleRowActive]}
            >
              <View
                style={[
                  styles.roleIconWrap,
                  opt.active && styles.roleIconWrapActive,
                ]}
              >
                <Ionicons
                  name={opt.icon}
                  size={18}
                  color={opt.active ? "#FFFFFF" : AppColors.heading}
                />
              </View>
              <Text style={styles.roleLabel} numberOfLines={1}>
                {opt.label}
              </Text>
              {roleBusy && !opt.active ? (
                <ActivityIndicator size="small" color={AppColors.accent} />
              ) : opt.active ? (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={AppColors.accent}
                />
              ) : (
                <Ionicons
                  name="swap-horizontal"
                  size={18}
                  color="rgba(0,0,0,0.35)"
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: bottomOffset + barHeight / 2,
          opacity,
          zIndex: 99,
          elevation: 99,
        }}
      >
        <LinearGradient
          colors={[FOG_TRANSPARENT, FOG_DENSE, SECTION_BG]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

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
            },
            barShadow,
          ]}
        >
          {tabs.map((tab) => {
            const isFocused =
              activeTab === tab.name ||
              (tab.name === "profile" && roleMenuOpen);
            const iconColor = isFocused
              ? AppColors.navText
              : "rgba(255, 255, 255, 0.45)";

            if (tab.center) {
              return (
                <TouchableOpacity
                  key={tab.name}
                  onPress={() => onTabPress(tab, isFocused)}
                  activeOpacity={0.8}
                  style={styles.tabItem}
                  accessibilityRole="button"
                  accessibilityLabel={t(tab.config.labelKey)}
                >
                  <View style={[styles.iconSlot, { height: iconSlot }]}>
                    <View
                      style={[
                        styles.centerCircle,
                        {
                          width: centerSize,
                          height: centerSize,
                          borderRadius: centerSize / 2,
                          transform: [{ translateY: -centerLift }],
                        },
                        isFocused && styles.centerCircleActive,
                      ]}
                    >
                      <LinearGradient
                        colors={["#E0559A", AppColors.accent, "#6E0F42"]}
                        locations={[0, 0.55, 1]}
                        start={{ x: 0.2, y: 0 }}
                        end={{ x: 0.8, y: 1 }}
                        style={[
                          StyleSheet.absoluteFill,
                          { borderRadius: centerSize / 2 },
                        ]}
                      />
                      <Ionicons
                        name="qr-code"
                        size={iconSize + 10}
                        color="#FFFFFF"
                        style={styles.centerIcon}
                      />
                    </View>
                  </View>
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
            }

            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() => onTabPress(tab, isFocused)}
                activeOpacity={0.7}
                style={styles.tabItem}
              >
                <View style={[styles.iconSlot, { height: iconSlot }]}>
                  <TabIcon
                    config={tab.config}
                    iconSize={iconSize + (tab.iconBoost ?? 0)}
                    iconColor={iconColor}
                  />
                </View>
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
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  iconSlot: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  centerCircle: {
    backgroundColor: AppColors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 16,
  },
  centerIcon: {
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  centerCircleActive: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  roleMenu: {
    position: "absolute",
    width: 240,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    zIndex: 101,
    elevation: 101,
  },
  roleMenuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.12)",
    marginVertical: 6,
    marginHorizontal: 8,
  },
  roleMenuTitle: {
    color: "rgba(0,0,0,0.5)",
    fontFamily: "PoppinsSemiBold",
    fontSize: 11,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 6,
    textTransform: "uppercase",
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  roleRowActive: {
    backgroundColor: "rgba(174, 37, 109, 0.08)",
  },
  roleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(14, 31, 88, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  roleIconWrapActive: {
    backgroundColor: AppColors.accent,
  },
  roleLabel: {
    flex: 1,
    color: AppColors.heading,
    fontFamily: "PoppinsSemiBold",
    fontSize: 14,
  },
});
