import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  ImageBackground,
  Platform,
  StatusBar,
  type ImageSourcePropType,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColors } from "../../constants/colors";
import { useRouter } from "expo-router";
import { usePlatformLogoSource } from "../context/BrandingContext";
import { useIsTablet } from "../../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";

type Props = {
  onMenuPress?: () => void;
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
  notificationUnreadCount?: number;
};

export default function HeroSection({
  onMenuPress,
  onProfilePress,
  onNotificationPress,
  notificationUnreadCount = 0,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isTablet = useIsTablet();
  const platformLogo = usePlatformLogoSource();

  // Ana sayfa hero görseli: internet çekmeden doğrudan yerel dosya.
  const heroSource: ImageSourcePropType = require("../../assets/images/banner-bg.jpg");
  const statusBarTopInset =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  const topInset = Math.max(insets.top, statusBarTopInset);

  const topBarPaddingTop = topInset + (isTablet ? 12 : 8);
  const searchTopGap = isTablet ? 12 : 8;
  const heroBottomPadding = isTablet ? 36 : 32;

  const TOP_ICON_BOX = isTablet ? 48 : 40;
  const MENU_ICON_SIZE = isTablet ? 28 : 24;
  const NOTIF_ICON_SIZE = isTablet ? 26 : 22;
  const LOGO_W = isTablet ? 200 : 150;
  const LOGO_H = isTablet ? 68 : 52;

  const openSearch = () => {
    router.push("/search" as import("expo-router").Href);
  };

  return (
    <View
      style={{
        backgroundColor: "transparent",
        overflow: "hidden",
      }}
    >
      <ImageBackground
        source={heroSource}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      <View
        style={{
          paddingTop: topBarPaddingTop,
          paddingBottom: heroBottomPadding,
        }}
      >
        <View
          className="flex-row items-center px-5"
          style={{ paddingBottom: isTablet ? 4 : 2 }}
        >
          <View
            style={{
              width: TOP_ICON_BOX,
              height: TOP_ICON_BOX,
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            <TouchableOpacity
              onPress={() => onMenuPress?.()}
              className="items-center justify-center"
              style={{ width: TOP_ICON_BOX, height: TOP_ICON_BOX }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Menü"
            >
              <Ionicons name="menu" size={MENU_ICON_SIZE} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View className="flex-1 items-center justify-center">
            <Image
              source={platformLogo}
              resizeMode="contain"
              style={{ width: LOGO_W, height: LOGO_H, tintColor: "#FFFFFF" }}
            />
          </View>
          <View
            style={{
              width: TOP_ICON_BOX,
              height: TOP_ICON_BOX,
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            <TouchableOpacity
              onPress={() => onNotificationPress?.()}
              className="items-center justify-center"
              style={{ width: TOP_ICON_BOX, height: TOP_ICON_BOX }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Bildirimler"
            >
              <Ionicons
                name={
                  notificationUnreadCount > 0
                    ? "notifications"
                    : "notifications-outline"
                }
                size={NOTIF_ICON_SIZE}
                color="#FFFFFF"
              />
              {notificationUnreadCount > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    top: isTablet ? 2 : 4,
                    right: isTablet ? 2 : 4,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: AppColors.accent,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4,
                    borderWidth: 2,
                    borderColor: "rgba(0,0,0,0.15)",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "PoppinsBold",
                      color: "#fff",
                      fontSize: 10,
                    }}
                  >
                    {notificationUnreadCount > 9
                      ? "9+"
                      : String(notificationUnreadCount)}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-5" style={{ marginTop: searchTopGap }}>
          <TouchableOpacity
            onPress={openSearch}
            activeOpacity={0.92}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: "rgba(255,255,255,0.96)",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: isTablet ? 13 : 11,
            }}
            accessibilityRole="button"
            accessibilityLabel="Ara"
          >
            <Ionicons
              name="search"
              size={isTablet ? 22 : 20}
              color="rgba(52,61,72,0.55)"
            />
            <Text
              style={{
                fontFamily: "PoppinsRegular",
                flex: 1,
                fontSize: isTablet ? 15 : 14,
                color: "rgba(52,61,72,0.5)",
              }}
            >
              Etkinlik veya mekan ara...
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({});
