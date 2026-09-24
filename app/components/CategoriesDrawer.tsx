import { useRouter } from "expo-router";
import {
  Animated,
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
  CONTROL_BORDER,
  NAV_BORDER_COLOR,
} from "../../constants/homeSection";
import type { CategoryItem } from "../../lib/definitions";
import { formatCategoryMenuLabel } from "../../lib/categoryIcons";
import { useTranslation } from "../context/_LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";
import { CategoryIcon } from "@/components/icons/CategoryIcon";
import { SiteIcon } from "@/components/icons/SiteIcon";
import { DRAWER_WIDTH } from "./DrawerMenu";

type Props = {
  modalVisible: boolean;
  pushAnim: Animated.Value;
  onClose: () => void;
  categories: CategoryItem[];
  activeCategory?: string | null;
};

/**
 * Navbar kategori ikonu → sağdan drawer.
 * Backdrop: NotificationDrawer ile birebir aynı (Pressable opacity'nin içinde).
 */
export default function CategoriesDrawer({
  modalVisible,
  pushAnim,
  onClose,
  categories,
  activeCategory = null,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();

  const drawerTranslateX = pushAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [DRAWER_WIDTH, 0],
  });

  const overlayOpacity = pushAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const go = (categoryId: string | "all") => {
    onClose();
    if (categoryId === "all") {
      router.push("/(tabs)/events");
      return;
    }
    router.push({
      pathname: "/(tabs)/events",
      params: { category: categoryId },
    });
  };

  const items: {
    id: string;
    label: string;
    value: string | "all";
    category:
      | { value?: string; label?: string; icon?: CategoryItem["icon"] }
      | "all";
  }[] = [
    {
      id: "all",
      label: formatCategoryMenuLabel(t("allCategories")),
      value: "all",
      category: "all",
    },
    ...categories.map((c) => ({
      id: c.id,
      label: formatCategoryMenuLabel(c.label),
      value: c.value,
      category: c,
    })),
  ];

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
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15,23,42,0.45)",
          opacity: overlayOpacity,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
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
          <Text style={styles.title}>{t("categories")}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityLabel={t("close")}
          >
            <SiteIcon icon="close" size={16} color="#2D2D2D" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 8,
            paddingTop: 8,
            paddingBottom: 40 + insets.bottom,
            gap: 2,
          }}
        >
          {items.map((item) => {
            const isActive =
              item.value === "all"
                ? activeCategory == null ||
                  activeCategory === "" ||
                  activeCategory === "all"
                : activeCategory === item.value;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => go(item.value)}
                activeOpacity={0.85}
                style={[styles.item, isActive && styles.itemActive]}
              >
                <View style={styles.iconWrap}>
                  <CategoryIcon
                    category={item.category}
                    size={22}
                    active={isActive}
                  />
                </View>
                <Text
                  style={[
                    styles.itemLabel,
                    isActive && styles.itemLabelActive,
                  ]}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: -8, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 20,
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
  title: {
    fontFamily: "PoppinsBold",
    fontSize: 16,
    color: AppColors.accent,
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
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  itemActive: {
    backgroundColor: "#F5F5F5",
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemLabel: {
    flex: 1,
    fontFamily: "PoppinsSemiBold",
    fontSize: 15,
    lineHeight: 20,
    color: "#2D2D2D",
  },
  itemLabelActive: {
    color: AppColors.accent,
  },
});
