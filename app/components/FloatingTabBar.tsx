import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  Animated,
  Platform,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColors } from "../../constants/colors";
import { useDrawer } from "../context/DrawerContext";
import { getScreenHorizontalInset, HOME_CARD_BORDER_RADIUS, useIsTablet } from "../../lib/responsive";
import { useTranslation } from "../context/LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";

type TabConfig = {
  iconFamily?: "ionicons" | "material";
  icon: string;
  labelKey: "home" | "events" | "venues" | "profile" | "scanTicket" | "admin" | "userMode";
};

const CONSUMER_TAB_CONFIG: Record<string, TabConfig> = {
  index: { iconFamily: "ionicons", icon: "home", labelKey: "home" },
  events: { iconFamily: "ionicons", icon: "calendar", labelKey: "events" },
  venues: {
    iconFamily: "material",
    icon: "map-marker-path",
    labelKey: "venues",
  },
  profile: { iconFamily: "ionicons", icon: "person", labelKey: "profile" },
};

const ADMIN_TAB_CONFIG: Record<string, TabConfig> = {
  events: { iconFamily: "ionicons", icon: "calendar", labelKey: "events" },
  scan: { iconFamily: "ionicons", icon: "qr-code", labelKey: "scanTicket" },
  profile: { iconFamily: "ionicons", icon: "person", labelKey: "profile" },
};

export type TabBarVariant = "consumer" | "admin";

type Props = BottomTabBarProps & {
  variant?: TabBarVariant;
  showAdminEntry?: boolean;
  onAdminPress?: () => void;
  onUserModePress?: () => void;
  showUserModeExit?: boolean;
  drawerAnim?: Animated.Value;
  notifAnim?: Animated.Value;
};

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

export default function FloatingTabBar({
  state,
  navigation,
  variant = "consumer",
  showAdminEntry = false,
  onAdminPress,
  onUserModePress,
  showUserModeExit = true,
  drawerAnim: drawerAnimProp,
  notifAnim: notifAnimProp,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { pushAnim: drawerFromContext } = useDrawer();
  const drawerAnim = drawerAnimProp ?? drawerFromContext;
  const notifAnim = notifAnimProp;
  const isTablet = useIsTablet();

  const bottomOffset = Math.max(insets.bottom, 12) + 8;
  const barHeight = isTablet ? 82 : 68;
  const sideInset = getScreenHorizontalInset(isTablet);
  const iconSize = isTablet ? 30 : 25;
  const labelSize = isTablet ? 12 : 10;
  const tabConfig =
    variant === "admin" ? ADMIN_TAB_CONFIG : CONSUMER_TAB_CONFIG;

  const showAccentTab =
    (variant === "consumer" && showAdminEntry) ||
    (variant === "admin" && showUserModeExit);

  const accentConfig: TabConfig =
    variant === "consumer"
      ? { iconFamily: "ionicons", icon: "people", labelKey: "admin" }
      : { iconFamily: "ionicons", icon: "swap-horizontal", labelKey: "userMode" };

  const onAccentPress =
    variant === "consumer" ? onAdminPress : onUserModePress;

  const barShadow = Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.22,
      shadowRadius: 20,
    },
    android: {
      elevation: 20,
    },
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

  const notifOpacity =
    notifAnim?.interpolate({
      inputRange: [0, 0.25],
      outputRange: [1, 0],
      extrapolate: "clamp",
    }) ?? 1;

  const opacity =
    notifAnim != null
      ? Animated.multiply(drawerOpacity, notifOpacity)
      : drawerOpacity;

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
      }}
    >
      <View
        style={[
          {
            flex: 1,
            borderRadius: HOME_CARD_BORDER_RADIUS,
            flexDirection: "row",
            overflow: "hidden",
          },
          barShadow,
        ]}
      >
        <View
          style={{
            flex: showAccentTab ? state.routes.length : 1,
            flexDirection: "row",
            alignItems: "stretch",
            backgroundColor: "#0E1F58",
            paddingHorizontal: showAccentTab ? 0 : 5,
          }}
        >
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const config = tabConfig[route.name] ?? {
              iconFamily: "ionicons" as const,
              icon: "ellipse",
              label: route.name,
            };

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const iconColor = isFocused
              ? AppColors.navText
              : "rgba(255, 255, 255, 0.45)";

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                }}
              >
                <TabIcon
                  config={config}
                  iconSize={iconSize}
                  iconColor={iconColor}
                />
                <Text
                  style={{
                    color: iconColor,
                    fontSize: labelSize,
                    fontFamily: "PoppinsSemiBold",
                  }}
                >
                  {t(config.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {showAccentTab ? (
          <TouchableOpacity
            onPress={() => onAccentPress?.()}
            activeOpacity={0.85}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              backgroundColor: AppColors.accent,
            }}
          >
            <TabIcon
              config={accentConfig}
              iconSize={iconSize}
              iconColor={AppColors.navText}
            />
            <Text
              style={{
                color: AppColors.navText,
                fontSize: labelSize,
                fontFamily: "PoppinsSemiBold",
              }}
            >
              {t(accentConfig.labelKey)}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
}
