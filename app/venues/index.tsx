import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { StatusBar } from "expo-status-bar";
import EntityListCard from "../components/detail/EntityListCard";
import MobileHomeHeader from "../components/MobileHomeHeader";
import MobileSearchSheet from "../components/MobileSearchSheet";
import { AppColors } from "../../constants/colors";
import { SECTION_BG, PAGE_GUTTER } from "../../constants/homeSection";
import { ENTITY_LIST_CARD } from "../../constants/mobileDetail";
import { useDrawer } from "../context/DrawerContext";
import { useNotificationsPanel } from "../context/NotificationContext";
import { useTranslation } from "../context/_LocaleContext";
import { appRefreshControl } from "../../lib/appRefreshControl";
import { CITY_OPTIONS } from "../../lib/cities";
import {
  fetchVenueCategories,
  type CategoryItem,
} from "../../lib/definitions";
import { buildEventsSearchHref, useTabGroup } from "../../lib/navigation";
import { useIsTablet } from "../../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";
import {
  fetchVenuesForListPage,
  venueImageCacheKey,
  type VenueItem,
} from "../../lib/venues";

const VENUE_CARD_IMAGE_WIDTH = { phone: 88, tablet: 104 };
const VENUE_CARD_MIN_HEIGHT = { phone: 88, tablet: 100 };

type PickerKey = "city" | "category";

type PickerItem = { id: string; label: string };

function getVenueCategoryLabel(
  venue: VenueItem,
  categoryLabels: Record<string, string>,
): string {
  return venue.categories
    .map((id) => categoryLabels[id])
    .filter(Boolean)
    .join(", ");
}

function VenueInfoRow({
  icon,
  label,
  isTablet,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isTablet: boolean;
}) {
  if (!label) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons
        name={icon}
        size={isTablet ? 15 : 13}
        color={AppColors.cardText}
        style={styles.infoIcon}
      />
      <Text
        style={[styles.infoText, isTablet && styles.infoTextTablet]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}

function VenueFilterField({
  value,
  onPress,
}: {
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.filterCell}
    >
      <Text style={styles.filterCellText} numberOfLines={1}>
        {value}
      </Text>
      <Ionicons name="chevron-down" size={14} color="#1A1A1A" />
    </TouchableOpacity>
  );
}

function VenuesToolbar({
  cityLabel,
  categoryLabel,
  onCityPress,
  onCategoryPress,
}: {
  cityLabel: string;
  categoryLabel: string;
  onCityPress: () => void;
  onCategoryPress: () => void;
}) {
  return (
    <View style={styles.toolbar}>
      <View style={styles.filterRow}>
        <VenueFilterField value={cityLabel} onPress={onCityPress} />
        <VenueFilterField value={categoryLabel} onPress={onCategoryPress} />
      </View>
    </View>
  );
}

export default function VenuesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments();
  const tabGroup = useTabGroup();
  const { openDrawer } = useDrawer();
  const { openNotifications, unreadCount } = useNotificationsPanel();
  const isTabScreen =
    segments[0] === "(tabs)" && segments.length === 2 && segments[1] === "venues";
  const isTablet = useIsTablet();
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [venueCategories, setVenueCategories] = useState<CategoryItem[]>([]);
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>(
    {},
  );
  const [siteSearchOpen, setSiteSearchOpen] = useState(false);
  const [siteSearchQuery, setSiteSearchQuery] = useState("");
  const [headerHeight, setHeaderHeight] = useState(0);
  const [cityFilter, setCityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [picker, setPicker] = useState<PickerKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVenues = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [data, categories] = await Promise.all([
        fetchVenuesForListPage(),
        fetchVenueCategories(),
      ]);
      setVenues(data);
      setVenueCategories(categories);
      setCategoryLabels(
        Object.fromEntries(categories.map((c) => [c.value, c.label])),
      );
    } catch {
      setError(t("venuesLoadError"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVenues();
  }, [loadVenues]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadVenues({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadVenues]);

  const filteredVenues = useMemo(() => {
    let list = venues;
    if (cityFilter) {
      list = list.filter((venue) => venue.city === cityFilter);
    }
    if (categoryFilter) {
      list = list.filter((venue) => venue.categories.includes(categoryFilter));
    }
    return [...list].sort((a, b) => {
      const countDiff = (b.eventCount || 0) - (a.eventCount || 0);
      if (countDiff !== 0) return countDiff;
      return String(a.name || "").localeCompare(String(b.name || ""), "tr", {
        sensitivity: "base",
      });
    });
  }, [venues, cityFilter, categoryFilter]);

  const cityFilterLabel = cityFilter
    ? CITY_OPTIONS.find((c) => c.value === cityFilter)?.label ?? cityFilter
    : t("selectCity");
  const categoryFilterLabel = categoryFilter
    ? categoryLabels[categoryFilter] ?? categoryFilter
    : t("selectCategory");

  const pickerItems = useMemo((): PickerItem[] => {
    if (picker === "city") {
      return [
        { id: "", label: t("all") },
        ...CITY_OPTIONS.map((c) => ({ id: c.value, label: c.label })),
      ];
    }
    if (picker === "category") {
      return [
        { id: "", label: t("all") },
        ...venueCategories.map((c) => ({ id: c.value, label: c.label })),
      ];
    }
    return [];
  }, [picker, venueCategories]);

  const openPicker = useCallback((key: PickerKey) => {
    setPicker(key);
  }, []);

  const closePicker = useCallback(() => {
    setPicker(null);
  }, []);

  const applyPicker = useCallback(
    (id: string) => {
      if (picker === "city") setCityFilter(id);
      if (picker === "category") setCategoryFilter(id);
      setPicker(null);
    },
    [picker],
  );

  const pickerSelected =
    picker === "city"
      ? cityFilter
      : picker === "category"
        ? categoryFilter
        : "";

  const contentStyle = {
    paddingBottom: isTablet ? 150 : 120,
    flexGrow: 1,
  };

  const listPadStyle = {
    paddingHorizontal: PAGE_GUTTER,
    paddingTop: 20,
    gap: 20,
  };

  const refreshCtrl = appRefreshControl(refreshing, onRefresh);
  const hasActiveFilters = !!cityFilter || !!categoryFilter;

  const pageChrome = (
    <>
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        {!isTabScreen ? (
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, isTablet && styles.backBtnTablet]}
          >
            <Ionicons
              name="chevron-back"
              size={isTablet ? 26 : 22}
              color={AppColors.cardText}
            />
          </TouchableOpacity>
        ) : (
          <View style={[styles.backBtn, isTablet && styles.backBtnTablet]} />
        )}
        <Text style={[styles.pageTitle, isTablet && styles.pageTitleTablet]}>
          {t("venues")}
        </Text>
        <View style={[styles.backBtn, isTablet && styles.backBtnTablet]} />
      </View>

      <VenuesToolbar
        cityLabel={cityFilterLabel}
        categoryLabel={categoryFilterLabel}
        onCityPress={() => openPicker("city")}
        onCategoryPress={() => openPicker("category")}
      />
    </>
  );

  return (
    <View
      style={[styles.safe, { backgroundColor: SECTION_BG }]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <MobileHomeHeader
        onMenuPress={openDrawer}
        onNotificationPress={openNotifications}
        notificationUnreadCount={unreadCount}
        searchOpen={siteSearchOpen}
        searchQuery={siteSearchQuery}
        onSearchOpenChange={setSiteSearchOpen}
        onSearchQueryChange={setSiteSearchQuery}
        onSearchSubmit={(query) => {
          router.push(
            buildEventsSearchHref(tabGroup, query) as import("expo-router").Href,
          );
        }}
        onHeaderHeightChange={setHeaderHeight}
      />

      {loading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentStyle}
          refreshControl={refreshCtrl}
          scrollEnabled={!siteSearchOpen}
        >
          {pageChrome}
          <View style={listPadStyle}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <View
                key={`venue-skeleton-${idx}`}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: ENTITY_LIST_CARD.radius,
                  overflow: "hidden",
                  minHeight: ENTITY_LIST_CARD.minHeight,
                }}
              >
                <View
                  style={{
                    width: "100%",
                    aspectRatio: ENTITY_LIST_CARD.imageAspect,
                    backgroundColor: "#E8ECF0",
                  }}
                />
                <View style={{ padding: 14, gap: 8 }}>
                  <View className="h-4 w-[70%] rounded bg-[#E8ECF0]" />
                  <View className="h-3 w-[40%] rounded bg-[#E8ECF0]" />
                  <View className="h-3 w-[30%] rounded bg-[#E8ECF0]" />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : error ? (
        <ScrollView
          contentContainerStyle={contentStyle}
          refreshControl={refreshCtrl}
          scrollEnabled={!siteSearchOpen}
        >
          {pageChrome}
          <View style={[listPadStyle, { justifyContent: "center", flexGrow: 1 }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentStyle}
          refreshControl={refreshCtrl}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!siteSearchOpen}
        >
          {pageChrome}
          <View style={listPadStyle}>
            {filteredVenues.length === 0 ? (
              <Text style={styles.emptyText}>
                {hasActiveFilters
                  ? t("noVenuesFilter")
                  : t("noVenuesEmpty")}
              </Text>
            ) : (
              filteredVenues.map((venue) => {
                const categoryLabel = getVenueCategoryLabel(venue, categoryLabels);
                return (
                  <EntityListCard
                    key={venue.id}
                    id={venue.id}
                    name={venue.name}
                    hrefBase="venues"
                    bannerUrl={venue.bannerUrl}
                    logoUrl={venue.logoUrl}
                    city={venue.city}
                    categoryLabel={categoryLabel}
                    cacheKey={venueImageCacheKey(venue)}
                  />
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={picker != null}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <Pressable style={styles.sortOverlay} onPress={closePicker}>
          <Pressable style={styles.sortSheet} onPress={() => {}}>
            <ScrollView style={{ maxHeight: 360 }}>
              {pickerItems.map((item) => (
                <TouchableOpacity
                  key={item.id || "all"}
                  style={[
                    styles.sortOption,
                    pickerSelected === item.id && styles.sortOptionActive,
                  ]}
                  onPress={() => applyPicker(item.id)}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      pickerSelected === item.id && styles.sortOptionTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <MobileSearchSheet
        visible={siteSearchOpen}
        topOffset={headerHeight}
        query={siteSearchQuery}
        scope="all"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  headerTablet: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  backBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnTablet: {
    width: 38,
    height: 38,
  },
  pageTitle: {
    color: "#000000",
    fontSize: 20,
    fontFamily: "PoppinsSemiBold",
  },
  pageTitleTablet: {
    fontSize: 26,
  },
  toolbar: {
    paddingHorizontal: PAGE_GUTTER,
    paddingBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
  },
  filterCell: {
    flex: 1,
    minWidth: 0,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D8DDE3",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterCellText: {
    flex: 1,
    minWidth: 0,
    fontFamily: "PoppinsBold",
    fontSize: 12,
    color: "#1A1A1A",
  },
  sortOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.4)",
    justifyContent: "flex-end",
  },
  sortSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 12,
    paddingBottom: 28,
    gap: 4,
  },
  sortOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  sortOptionActive: {
    backgroundColor: "#FAF5F8",
  },
  sortOptionText: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 15,
    color: "#1A1A1A",
  },
  sortOptionTextActive: {
    color: AppColors.accent,
  },
  venueCard: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "stretch",
  },
  venueCardImage: {
    alignSelf: "stretch",
    backgroundColor: "#E8ECF0",
  },
  skeletonImage: {
    alignSelf: "stretch",
    backgroundColor: "#E8ECF0",
  },
  venueCardBody: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 10,
    paddingLeft: 10,
    justifyContent: "center",
  },
  venueCardBodyTablet: {
    paddingVertical: 10,
    paddingRight: 12,
    paddingLeft: 12,
  },
  category: {
    color: AppColors.accent,
    fontSize: 10,
    fontFamily: "PoppinsSemiBold",
    marginBottom: 1,
  },
  categoryTablet: {
    fontSize: 11,
  },
  title: {
    color: AppColors.heading,
    fontSize: 14,
    fontFamily: "PoppinsSemiBold",
    lineHeight: 18,
  },
  titleTablet: {
    fontSize: 15,
    lineHeight: 20,
  },
  titleDivider: {
    height: 1,
    backgroundColor: "rgba(52, 61, 72, 0.1)",
    marginTop: 4,
    marginBottom: 3,
  },
  infoList: {
    gap: 3,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoIcon: {
    width: 14,
  },
  infoText: {
    flex: 1,
    color: AppColors.cardText,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "PoppinsMedium",
  },
  infoTextTablet: {
    fontSize: 13,
    lineHeight: 17,
  },
  emptyText: {
    color: AppColors.cardText,
    fontSize: 14,
    fontFamily: "PoppinsRegular",
    opacity: 0.8,
    textAlign: "center",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 14,
    textAlign: "center",
  },
});
