import { Ionicons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Animated,
  Easing,
  Image,
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppColors } from "../../constants/colors";
import {
  CONTROL_BORDER,
  NAV_BORDER_COLOR,
} from "../../constants/homeSection";
import { fetchBrowsableCategories, type CategoryItem } from "../../lib/definitions";
import { usePlatformLogoSource } from "../context/BrandingContext";
import { useTranslation } from "../context/_LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";
import { SiteIcon } from "@/components/icons/SiteIcon";
import CategoriesDrawer from "./CategoriesDrawer";
import Hamburger from "./HamburgerIcon";
import LanguagePicker, { getNavControlScale } from "./LanguagePicker";

type Props = {
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
  notificationUnreadCount?: number;
  /** Arama paneli açık (üst navbar kalır) */
  searchOpen?: boolean;
  searchQuery?: string;
  onSearchOpenChange?: (open: boolean) => void;
  onSearchQueryChange?: (query: string) => void;
  /** Toplam header yüksekliği — sheet topOffset için */
  onHeaderHeightChange?: (height: number) => void;
  /** Ara butonu / klavye search — web gibi etkinliklere git */
  onSearchSubmit?: (query: string) => void;
};

export default function MobileHomeHeader({
  onMenuPress,
  onNotificationPress,
  notificationUnreadCount = 0,
  searchOpen = false,
  searchQuery = "",
  onSearchOpenChange,
  onSearchQueryChange,
  onHeaderHeightChange,
  onSearchSubmit,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const navScale = useMemo(() => getNavControlScale(screenWidth), [screenWidth]);
  const platformLogo = usePlatformLogoSource();
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const categoriesAnim = useRef(new Animated.Value(0)).current;

  const closeCategories = useCallback(() => {
    Animated.timing(categoriesAnim, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setCategoriesOpen(false);
    });
  }, [categoriesAnim]);

  // Safe-area yeterli; Android'de currentHeight ile toplama çift boşluk yaratıyordu.
  // Translucent status bar + white header → şebeke/pil ikonları navbar üstünde görünür.
  const topInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === "android"
        ? (RNStatusBar.currentHeight ?? 0)
        : 0;

  const actionBtnStyle = useMemo(
    () => [
      styles.actionBtn,
      {
        width: navScale.size,
        height: navScale.size,
        borderRadius: navScale.radius,
      },
    ],
    [navScale],
  );

  const logoStyle = useMemo(() => {
    const h = Math.round(44 + (navScale.size - 40) * 0.6);
    const w = Math.round(h * (124 / 44));
    return { width: w, height: h };
  }, [navScale.size]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchBrowsableCategories();
      setCategories(data);
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    RNStatusBar.setTranslucent(true);
    RNStatusBar.setBackgroundColor("transparent");
    RNStatusBar.setBarStyle("dark-content");
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (searchOpen) {
      const tm = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(tm);
    }
  }, [searchOpen]);

  const openSearch = () => {
    onSearchOpenChange?.(true);
  };

  const closeSearch = () => {
    onSearchQueryChange?.("");
    onSearchOpenChange?.(false);
    inputRef.current?.blur();
  };

  const openCategories = useCallback(() => {
    onSearchQueryChange?.("");
    onSearchOpenChange?.(false);
    inputRef.current?.blur();
    setCategoriesOpen(true);
    categoriesAnim.setValue(0);
    Animated.timing(categoriesAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [categoriesAnim, onSearchOpenChange, onSearchQueryChange]);

  const submitSearch = () => {
    const q = searchQuery.trim();
    inputRef.current?.blur();
    onSearchSubmit?.(q);
    onSearchQueryChange?.("");
    onSearchOpenChange?.(false);
  };

  const goHome = () => {
    if (searchOpen) closeSearch();
    if (categoriesOpen) closeCategories();
    router.replace("/(tabs)" as import("expo-router").Href);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    onHeaderHeightChange?.(e.nativeEvent.layout.height);
  };

  return (
    <View style={[styles.wrap, { paddingTop: topInset }]} onLayout={onLayout}>
      <ExpoStatusBar style="dark" />
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={goHome}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t("home")}
          hitSlop={6}
        >
          <Image
            source={platformLogo}
            resizeMode="contain"
            style={logoStyle}
          />
        </TouchableOpacity>
        <View style={styles.actions}>
          <LanguagePicker />

          <TouchableOpacity
            onPress={openCategories}
            style={actionBtnStyle}
            accessibilityRole="button"
            accessibilityLabel={t("categories")}
          >
            <SiteIcon icon="category" size={navScale.iconSize} color="#2D2D2D" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (searchOpen) closeSearch();
              if (categoriesOpen) closeCategories();
              onNotificationPress?.();
            }}
            style={actionBtnStyle}
            accessibilityRole="button"
            accessibilityLabel="Bildirimler"
          >
            <Ionicons
              name={
                notificationUnreadCount > 0
                  ? "notifications"
                  : "notifications-outline"
              }
              size={navScale.iconSize}
              color="#2D2D2D"
            />
            {notificationUnreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notificationUnreadCount > 9
                    ? "9+"
                    : String(notificationUnreadCount)}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (searchOpen) closeSearch();
              if (categoriesOpen) closeCategories();
              onMenuPress?.();
            }}
            style={actionBtnStyle}
            accessibilityRole="button"
            accessibilityLabel="Menü"
          >
            <Hamburger />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBox,
            {
              borderColor: searchOpen ? "#1A1A1A" : AppColors.accent,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            value={searchQuery}
            onChangeText={(v) => {
              onSearchQueryChange?.(v);
              if (!searchOpen) onSearchOpenChange?.(true);
            }}
            onFocus={openSearch}
            onSubmitEditing={submitSearch}
            placeholder={t("searchPlaceholder")}
            placeholderTextColor="#A0A8B0"
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          {searchOpen ? (
            <TouchableOpacity
              onPress={closeSearch}
              style={styles.clearBtn}
              hitSlop={6}
              accessibilityLabel={t("close")}
            >
              <SiteIcon icon="close" size={16} color="#6B7280" />
            </TouchableOpacity>
          ) : searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => onSearchQueryChange?.("")}
              style={styles.clearBtn}
              hitSlop={6}
            >
              <SiteIcon icon="close" size={14} color="#6B7280" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={submitSearch}
            activeOpacity={0.9}
            style={styles.searchBtn}
            accessibilityRole="button"
            accessibilityLabel={t("search")}
          >
            <SiteIcon icon="search" size={13} color="#FFFFFF" />
            <Text style={styles.searchBtnText}>{t("search")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <CategoriesDrawer
        modalVisible={categoriesOpen}
        pushAnim={categoriesAnim}
        onClose={closeCategories}
        categories={categories}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: NAV_BORDER_COLOR,
    paddingBottom: 12,
    zIndex: 50,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: CONTROL_BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: AppColors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: "PoppinsBold",
    color: "#fff",
    fontSize: 9,
  },
  searchRow: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  searchBox: {
    height: 46,
    borderRadius: 10,
    paddingLeft: 16,
    // Üst boşlukla aynı: (46 - border*2 - btn36) / 2 = 3
    paddingRight: 3,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    shadowColor: "#0F2137",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  input: {
    flex: 1,
    fontFamily: "PoppinsRegular",
    fontSize: 16,
    color: "#1A1A1A",
    paddingVertical: 0,
    marginRight: 8,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },
  searchBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: AppColors.accent,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  searchBtnText: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
});
