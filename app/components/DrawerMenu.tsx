import { Image } from "expo-image";
import { useState } from "react";
import {
  Animated,
  Dimensions,
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
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel={t("close")}
            >
              <SiteIcon icon="close" size={16} color="#2D2D2D" />
            </TouchableOpacity>
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
                    paddingVertical: isTablet ? 14 : 12,
                    paddingHorizontal: rowPadH,
                  }}
                >
                  <Text
                    style={{
                      color:
                        activeItem === "managerEvents"
                          ? AppColors.heading
                          : AppColors.cardText,
                      fontSize: isTablet ? 20 : 16,
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
                        paddingVertical: isTablet ? 14 : 12,
                        paddingHorizontal: rowPadH,
                      }}
                    >
                      <Text
                        style={{
                          color: isActive
                            ? AppColors.heading
                            : AppColors.cardText,
                          fontSize: isTablet ? 20 : 16,
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
    marginBottom: 18,
    paddingTop: 6,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(52, 61, 72, 0.22)",
    marginBottom: 12,
    marginTop: 2,
  },
  sectionTitle: {
    color: AppColors.heading,
    fontFamily: "PoppinsBold",
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: 4,
    marginTop: 4,
  },
  sectionTitleTablet: {
    fontSize: 13,
  },
});
