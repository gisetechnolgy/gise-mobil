import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import {
  Animated,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColors } from "../../constants/colors";
import { usePlatformLogoSource } from "../context/BrandingContext";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/LocaleContext";
import { useIsTablet } from "../../lib/responsive";
import type { TranslationKey } from "../../lib/i18n";
import { AppText as Text } from "@/components/ui/AppText";

const SCREEN_WIDTH = Dimensions.get("window").width;
const IS_TABLET_LAYOUT = SCREEN_WIDTH >= 768;
export const DRAWER_WIDTH = IS_TABLET_LAYOUT
  ? Math.min(Math.round(SCREEN_WIDTH * 0.52), 520)
  : Math.round(SCREEN_WIDTH * 0.68);

/** Menü satırı ile logo sol hizası için padding sabitleri */
const MENU_PAD_H_PHONE = 4;
const MENU_PAD_H_TABLET = 8;
const ROW_PAD_H_PHONE = 20;
const ROW_PAD_H_TABLET = 26;

/** Logo dosya oranı 1185×438 */
const LOGO_ASPECT = 1185 / 438;

type DrawerMenuItem = {
  id: string;
  labelKey: TranslationKey;
  icon: keyof typeof Ionicons.glyphMap;
};

const HELP_URL = "https://destek.gisekibris.com";

const BASE_MENU_ITEMS: DrawerMenuItem[] = [
  { id: "help", labelKey: "help", icon: "help-circle" },
  { id: "corporate", labelKey: "corporate", icon: "business" },
  { id: "salesPartner", labelKey: "salesPartner", icon: "people" },
  { id: "news", labelKey: "newsMenu", icon: "newspaper" },
];

const MANAGER_MENU_ITEMS: DrawerMenuItem[] = [
  { id: "managerEvents", labelKey: "adminEvents", icon: "storefront" },
  { id: "help", labelKey: "help", icon: "help-circle" },
  { id: "corporate", labelKey: "corporate", icon: "business" },
  { id: "salesPartner", labelKey: "salesPartner", icon: "people" },
  { id: "news", labelKey: "newsMenu", icon: "newspaper" },
];

type Props = {
  /** Controls Modal visibility — set true before starting animation */
  modalVisible: boolean;
  /** Shared 0→1 Animated.Value driven by parent (useNativeDriver: true) */
  pushAnim: Animated.Value;
  onClose: () => void;
  onNavigate?: (id: string) => void;
};

export default function DrawerMenu({
  modalVisible,
  pushAnim,
  onClose,
  onNavigate,
}: Props) {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const platformLogo = usePlatformLogoSource();
  const { user } = useAuth();
  const { t } = useTranslation();

  const menuItems =
    user?.isSaleMode ? MANAGER_MENU_ITEMS : BASE_MENU_ITEMS;

  const [activeItem, setActiveItem] = useState<string | null>(null);

  const drawerTranslateX = pushAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  const overlayOpacity = pushAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const handlePress = (id: string) => {
    setActiveItem(id);
    setTimeout(() => {
      onClose();
      if (id === "help") {
        Linking.openURL(HELP_URL);
        return;
      }
      onNavigate?.(id);
    }, 160);
  };

  const logoH = isTablet ? 80 : 66;
  const logoW = Math.round(logoH * LOGO_ASPECT);
  const menuPadH = isTablet ? MENU_PAD_H_TABLET : MENU_PAD_H_PHONE;
  const rowPadH = isTablet ? ROW_PAD_H_TABLET : ROW_PAD_H_PHONE;
  const contentInsetLeft = menuPadH + rowPadH;

  return (
    <Modal
      visible={modalVisible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          opacity: overlayOpacity,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: DRAWER_WIDTH,
          backgroundColor: AppColors.cardBg,
          transform: [{ translateX: drawerTranslateX }],
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 16,
          shadowOffset: { width: 8, height: 0 },
          elevation: 20,
        }}
      >
        <View style={{ flex: 1 }}>
          <View
            style={{
              paddingTop: insets.top + (isTablet ? 24 : 18),
              paddingLeft: contentInsetLeft,
              paddingRight: isTablet ? 24 : 16,
              paddingBottom: isTablet ? 18 : 14,
              alignItems: "flex-start",
            }}
          >
            <Image
              source={platformLogo}
              contentFit="contain"
              contentPosition="left center"
              cachePolicy="memory-disk"
              recyclingKey="drawer-platform-logo"
              style={{
                width: logoW,
                height: logoH,
              }}
            />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: menuPadH,
              paddingTop: isTablet ? 8 : 4,
              paddingBottom: isTablet ? 16 : 12,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {menuItems.map((item, index) => {
              const isActive = activeItem === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handlePress(item.id)}
                  activeOpacity={0.65}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: isTablet ? 18 : 14,
                    paddingVertical: isTablet ? 18 : 14,
                    paddingHorizontal: rowPadH,
                    borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                    borderBottomColor: "rgba(52, 61, 72, 0.1)",
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={isTablet ? 28 : 22}
                    color={isActive ? AppColors.heading : AppColors.cardText}
                  />
                  <Text
                    style={{
                      flex: 1,
                      color: isActive ? AppColors.heading : AppColors.cardText,
                      fontSize: isTablet ? 24 : 17,
                      fontFamily: isActive ? "PoppinsBold" : "PoppinsMedium",
                    }}
                  >
                    {t(item.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View
            style={{
              paddingBottom: Math.max(insets.bottom, 12),
            }}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}
