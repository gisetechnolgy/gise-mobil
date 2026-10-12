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
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColors } from "../../constants/colors";
import {
  FOOTER_MENU_COLUMNS,
  localizeLabel,
  type FooterMenuItem,
} from "../../constants/footerMenu";
import {
  CONTROL_BORDER,
  NAV_BORDER_COLOR,
} from "../../constants/homeSection";
import { TAB_BAR_SCROLL_BOTTOM } from "../../constants/tabBar";
import { usePlatformLogoSource } from "../context/BrandingContext";
import { useAuth } from "../context/AuthContext";
import { useLocale, useTranslation } from "../context/_LocaleContext";
import { useIsTablet } from "../../lib/responsive";
import LanguagePicker from "./LanguagePicker";
import { AppText as Text } from "@/components/ui/AppText";
import { SiteIcon } from "@/components/icons/SiteIcon";

const SCREEN_WIDTH = Dimensions.get("window").width;
const IS_TABLET_LAYOUT = SCREEN_WIDTH >= 768;
export const DRAWER_WIDTH = IS_TABLET_LAYOUT
  ? Math.min(Math.round(SCREEN_WIDTH * 0.52), 520)
  : Math.min(Math.round(SCREEN_WIDTH * 0.86), 340);

const MENU_PAD_H_PHONE = 4;
const MENU_PAD_H_TABLET = 8;
const ROW_PAD_H_PHONE = 20;
const ROW_PAD_H_TABLET = 26;
const LOGO_ASPECT = 1185 / 438;

const SOCIAL_LINKS: {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  url: string;
}[] = [
  {
    id: "instagram",
    label: "Instagram",
    icon: "logo-instagram",
    url: "https://www.instagram.com/gisekibris",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: "logo-facebook",
    url: "https://www.facebook.com/gisekibris",
  },
  {
    id: "x",
    label: "X",
    icon: "logo-x",
    url: "https://twitter.com/gisekibris",
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: "logo-youtube",
    url: "https://www.youtube.com/channel/UCLWWGONjci9N3wl5SC3zsCg",
  },
];

export type DrawerNavigatePayload =
  | { type: "route"; href: string }
  | { type: "page"; pageId: string }
  | { type: "corporate"; slug: string };

type Props = {
  modalVisible: boolean;
  pushAnim: Animated.Value;
  onClose: () => void;
  onNavigate?: (payload: DrawerNavigatePayload) => void;
};

/** Web footer ile aynı sütun / sıra — sağdan overlay */
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
  const { locale } = useLocale();
  const [activeItem, setActiveItem] = useState<string | null>(null);

  const drawerTranslateX = pushAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [DRAWER_WIDTH, 0],
  });

  const overlayOpacity = pushAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const handleItem = (item: FooterMenuItem) => {
    setActiveItem(item.id);
    setTimeout(() => {
      onClose();
      const { action } = item;
      if (action.type === "route") {
        onNavigate?.({ type: "route", href: action.href });
        return;
      }
      if (action.type === "page") {
        onNavigate?.({ type: "page", pageId: action.pageId });
        return;
      }
      if (action.type === "corporate") {
        onNavigate?.({ type: "corporate", slug: action.slug });
      }
    }, 160);
  };

  const logoH = isTablet ? 56 : 44;
  const logoW = Math.round(logoH * LOGO_ASPECT);
  const menuPadH = isTablet ? MENU_PAD_H_TABLET : MENU_PAD_H_PHONE;
  const rowPadH = isTablet ? ROW_PAD_H_TABLET : ROW_PAD_H_PHONE;
  const rowPadV = isTablet ? 10 : 8;
  const itemFontSize = isTablet ? 17 : 14;
  const tabClearance = isTablet
    ? TAB_BAR_SCROLL_BOTTOM.tablet
    : TAB_BAR_SCROLL_BOTTOM.phone;

  return (
    <Modal
      visible={modalVisible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              paddingTop: insets.top + 8,
              transform: [{ translateX: drawerTranslateX }],
            },
          ]}
        >
          <View style={styles.header}>
            <Image
              source={platformLogo}
              contentFit="contain"
              contentPosition="left center"
              cachePolicy="memory-disk"
              recyclingKey="drawer-platform-logo"
              style={{ width: logoW, height: logoH }}
            />
            <View style={styles.headerActions}>
              <LanguagePicker />
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityLabel={t("close")}
              >
                <SiteIcon icon="close" size={16} color="#2D2D2D" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: menuPadH,
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 16) + tabClearance,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {user?.isSaleMode ? (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    isTablet && styles.sectionTitleTablet,
                    { paddingHorizontal: rowPadH },
                  ]}
                >
                  {t("admin")}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setActiveItem("managerEvents");
                    setTimeout(() => {
                      onClose();
                      onNavigate?.({
                        type: "route",
                        href: "/(admin-tabs)/events",
                      });
                    }, 160);
                  }}
                  activeOpacity={0.65}
                  style={{
                    paddingVertical: rowPadV,
                    paddingHorizontal: rowPadH,
                  }}
                >
                  <Text
                    style={{
                      color:
                        activeItem === "managerEvents"
                          ? AppColors.heading
                          : AppColors.cardText,
                      fontSize: itemFontSize,
                      fontFamily:
                        activeItem === "managerEvents"
                          ? "PoppinsSemiBold"
                          : "PoppinsMedium",
                    }}
                  >
                    {t("adminEvents")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {FOOTER_MENU_COLUMNS.map((column, columnIndex) => (
              <View key={column.id} style={styles.section}>
                {columnIndex > 0 || user?.isSaleMode ? (
                  <View
                    style={[
                      styles.sectionDivider,
                      { marginHorizontal: rowPadH },
                    ]}
                  />
                ) : null}
                <Text
                  style={[
                    styles.sectionTitle,
                    isTablet && styles.sectionTitleTablet,
                    { paddingHorizontal: rowPadH },
                  ]}
                >
                  {localizeLabel(column.title, locale)}
                </Text>
                {column.items.map((item) => {
                  const isActive = activeItem === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleItem(item)}
                      activeOpacity={0.65}
                      style={{
                        paddingVertical: rowPadV,
                        paddingHorizontal: rowPadH,
                      }}
                    >
                      <Text
                        style={{
                          color: isActive
                            ? AppColors.heading
                            : AppColors.cardText,
                          fontSize: itemFontSize,
                          fontFamily: isActive
                            ? "PoppinsSemiBold"
                            : "PoppinsMedium",
                        }}
                      >
                        {localizeLabel(item.label, locale)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <View
              style={[styles.sectionDivider, { marginHorizontal: rowPadH }]}
            />
            <View style={[styles.socialRow, { paddingHorizontal: rowPadH }]}>
              {SOCIAL_LINKS.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => void Linking.openURL(s.url)}
                  activeOpacity={0.7}
                  style={[
                    styles.socialBtn,
                    isTablet && styles.socialBtnTablet,
                  ]}
                  accessibilityRole="link"
                  accessibilityLabel={s.label}
                >
                  <Ionicons
                    name={s.icon}
                    size={isTablet ? 22 : 19}
                    color={AppColors.heading}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  drawer: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: -8, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: NAV_BORDER_COLOR,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CONTROL_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: 8,
    paddingTop: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(52, 61, 72, 0.22)",
    marginBottom: 8,
    marginTop: 2,
  },
  sectionTitle: {
    color: AppColors.heading,
    fontFamily: "PoppinsBold",
    fontSize: 15,
    letterSpacing: 0.6,
    marginBottom: 2,
    marginTop: 2,
  },
  sectionTitleTablet: {
    fontSize: 17,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 4,
  },
  socialBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CONTROL_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  socialBtnTablet: {
    width: 46,
    height: 46,
  },
});
