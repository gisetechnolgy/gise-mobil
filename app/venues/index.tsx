import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { RemoteCardImage } from "../components/RemoteCardImage";
import { AppColors } from "../../constants/colors";
import { useTranslation } from "../context/LocaleContext";
import { appRefreshControl } from "../../lib/appRefreshControl";
import { CITY_OPTIONS, formatCityLabel } from "../../lib/cities";
import {
  fetchVenueCategories,
  type CategoryItem,
} from "../../lib/definitions";
import { useIsTablet } from "../../lib/responsive";
import { resolveRemoteImageUrl } from "../../lib/remoteImage";
import { AppText as Text } from "@/components/ui/AppText";
import {
  fetchVenuesWithFeaturedOrder,
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
  label,
  value,
  onPress,
  isTablet,
}: {
  label: string;
  value: string;
  onPress: () => void;
  isTablet: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.filterField, isTablet && styles.filterFieldTablet]}
    >
      <Text style={[styles.filterFieldLabel, isTablet && styles.filterFieldLabelTablet]}>
        {label}
      </Text>
      <Text
        style={[styles.filterFieldValue, isTablet && styles.filterFieldValueTablet]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </TouchableOpacity>
  );
}

function VenueFilterBottomSheet({
  visible,
  title,
  items,
  draftId,
  onChangeDraft,
  onConfirm,
  onClose,
  isTablet,
  bottomInset,
}: {
  visible: boolean;
  title: string;
  items: PickerItem[];
  draftId: string;
  onChangeDraft: (id: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isTablet: boolean;
  bottomInset: number;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetDismissArea} onPress={onClose} />
        <View style={[styles.sheet, isTablet && styles.sheetTablet]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, isTablet && styles.sheetTitleTablet]}>
            {title}
          </Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.sheetList,
              isTablet && styles.sheetListTablet,
            ]}
            style={styles.sheetScroll}
          >
            {items.map((item) => {
              const active = draftId === item.id;
              return (
                <TouchableOpacity
                  key={item.id || "all"}
                  activeOpacity={0.85}
                  onPress={() => onChangeDraft(item.id)}
                  style={[
                    styles.sheetItem,
                    isTablet && styles.sheetItemTablet,
                    active && styles.sheetItemActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.sheetItemText,
                      isTablet && styles.sheetItemTextTablet,
                      active && styles.sheetItemTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View
            style={[
              styles.sheetFooter,
              isTablet && styles.sheetFooterTablet,
              { paddingBottom: Math.max(bottomInset, 16) },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onConfirm}
              style={[styles.sheetConfirmButton, isTablet && styles.sheetConfirmButtonTablet]}
            >
              <Text
                style={[
                  styles.sheetConfirmText,
                  isTablet && styles.sheetConfirmTextTablet,
                ]}
              >
                Tamam
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function VenuesToolbar({
  searchQuery,
  onSearchChange,
  cityLabel,
  categoryLabel,
  onCityPress,
  onCategoryPress,
  isTablet,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  cityLabel: string;
  categoryLabel: string;
  onCityPress: () => void;
  onCategoryPress: () => void;
  isTablet: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.toolbar, isTablet && styles.toolbarTablet]}>
      <View style={[styles.searchRow, isTablet && styles.searchRowTablet]}>
        <Ionicons name="search" size={20} color="rgba(52,61,72,0.55)" />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder={t("venuesSearchPlaceholder")}
          placeholderTextColor="rgba(52,61,72,0.45)"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, isTablet && styles.searchInputTablet]}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity
            onPress={() => onSearchChange("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color="rgba(52,61,72,0.45)"
            />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.filterRow}>
        <VenueFilterField
          label={t("city")}
          value={cityLabel}
          onPress={onCityPress}
          isTablet={isTablet}
        />
        <VenueFilterField
          label={t("category")}
          value={categoryLabel}
          onPress={onCategoryPress}
          isTablet={isTablet}
        />
      </View>
    </View>
  );
}

export default function VenuesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const isTabScreen =
    segments[0] === "(tabs)" && segments.length === 2 && segments[1] === "venues";
  const isTablet = useIsTablet();
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [venueCategories, setVenueCategories] = useState<CategoryItem[]>([]);
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>(
    {},
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [picker, setPicker] = useState<PickerKey | null>(null);
  const [draftId, setDraftId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVenues = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [data, categories] = await Promise.all([
        fetchVenuesWithFeaturedOrder(),
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
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((venue) => {
        const haystack = [
          venue.name,
          formatCityLabel(venue.city),
          venue.address ?? "",
          getVenueCategoryLabel(venue, categoryLabels),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }
    return list;
  }, [venues, cityFilter, categoryFilter, searchQuery, categoryLabels]);

  const cityFilterLabel =
    CITY_OPTIONS.find((c) => c.value === cityFilter)?.label ?? t("all");
  const categoryFilterLabel =
    categoryLabels[categoryFilter] ?? t("all");

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

  const pickerTitle = picker === "city" ? t("city") : picker === "category" ? t("category") : "";

  const openPicker = useCallback(
    (key: PickerKey) => {
      setDraftId(key === "city" ? cityFilter : categoryFilter);
      setPicker(key);
    },
    [cityFilter, categoryFilter],
  );

  const confirmPicker = useCallback(() => {
    if (picker === "city") setCityFilter(draftId);
    if (picker === "category") setCategoryFilter(draftId);
    setPicker(null);
  }, [draftId, picker]);

  const closePicker = useCallback(() => {
    setPicker(null);
  }, []);

  const contentStyle = {
    paddingHorizontal: isTablet ? 26 : 20,
    paddingTop: isTablet ? 12 : 10,
    gap: isTablet ? 16 : 12,
    paddingBottom: isTablet ? 150 : 120,
    flexGrow: 1,
  };

  const refreshCtrl = appRefreshControl(refreshing, onRefresh);
  const hasActiveFilters =
    !!searchQuery.trim() || !!cityFilter || !!categoryFilter;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        {isTabScreen ? (
          <View style={[styles.backBtn, isTablet && styles.backBtnTablet]} />
        ) : (
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
        )}
        <Text style={[styles.pageTitle, isTablet && styles.pageTitleTablet]}>
          {t("venues")}
        </Text>
        <View style={[styles.backBtn, isTablet && styles.backBtnTablet]} />
      </View>

      <VenuesToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cityLabel={cityFilterLabel}
        categoryLabel={categoryFilterLabel}
        onCityPress={() => openPicker("city")}
        onCategoryPress={() => openPicker("category")}
        isTablet={isTablet}
      />

      {loading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentStyle}
          refreshControl={refreshCtrl}
        >
          {Array.from({ length: 5 }).map((_, idx) => (
            <View key={`venue-skeleton-${idx}`} style={styles.venueCard}>
              <View
                style={[
                  styles.skeletonImage,
                  {
                    width: isTablet
                      ? VENUE_CARD_IMAGE_WIDTH.tablet
                      : VENUE_CARD_IMAGE_WIDTH.phone,
                    minHeight: isTablet
                      ? VENUE_CARD_MIN_HEIGHT.tablet
                      : VENUE_CARD_MIN_HEIGHT.phone,
                  },
                ]}
              />
              <View
                style={[styles.venueCardBody, isTablet && styles.venueCardBodyTablet]}
              >
                <View className="h-3 w-[36%] rounded bg-[#E8ECF0]" />
                <View className="h-4 w-[88%] rounded bg-[#E8ECF0] mt-2" />
                <View className="h-px w-full rounded bg-[#E8ECF0] mt-2" />
                <View className="h-3 w-[58%] rounded bg-[#E8ECF0] mt-2" />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : error ? (
        <ScrollView
          contentContainerStyle={[contentStyle, { justifyContent: "center" }]}
          refreshControl={refreshCtrl}
        >
          <Text style={styles.errorText}>{error}</Text>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentStyle}
          refreshControl={refreshCtrl}
          keyboardShouldPersistTaps="handled"
        >
          {filteredVenues.length === 0 ? (
            <Text style={styles.emptyText}>
              {hasActiveFilters
                ? t("noVenuesFilter")
                : t("noVenuesEmpty")}
            </Text>
          ) : (
            filteredVenues.map((venue) => {
              const categoryLabel = getVenueCategoryLabel(venue, categoryLabels);
              const imageWidth = isTablet
                ? VENUE_CARD_IMAGE_WIDTH.tablet
                : VENUE_CARD_IMAGE_WIDTH.phone;
              const cardMinHeight = isTablet
                ? VENUE_CARD_MIN_HEIGHT.tablet
                : VENUE_CARD_MIN_HEIGHT.phone;
              const logoUri = resolveRemoteImageUrl(
                venue.logoUrl,
                venueImageCacheKey(venue),
              );
              const cityLabel = formatCityLabel(venue.city);

              return (
                <TouchableOpacity
                  key={venue.id}
                  style={styles.venueCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push(`/venues/${venue.id}` as import("expo-router").Href)
                  }
                >
                  <RemoteCardImage
                    uri={logoUri}
                    recyclingKey={venue.id}
                    contentFit="cover"
                    style={[
                      styles.venueCardImage,
                      { width: imageWidth, minHeight: cardMinHeight },
                    ]}
                    fallbackSource={require("../../assets/images/img-placeholder.jpg")}
                  />
                  <View
                    style={[
                      styles.venueCardBody,
                      isTablet && styles.venueCardBodyTablet,
                    ]}
                  >
                    {categoryLabel ? (
                      <Text
                        style={[styles.category, isTablet && styles.categoryTablet]}
                        numberOfLines={1}
                      >
                        {categoryLabel}
                      </Text>
                    ) : null}
                    <Text
                      style={[styles.title, isTablet && styles.titleTablet]}
                      numberOfLines={2}
                    >
                      {venue.name}
                    </Text>
                    <View style={styles.titleDivider} />
                    <View style={styles.infoList}>
                      {cityLabel ? (
                        <VenueInfoRow
                          icon="location"
                          label={cityLabel}
                          isTablet={isTablet}
                        />
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      <VenueFilterBottomSheet
        visible={picker != null}
        title={pickerTitle}
        items={pickerItems}
        draftId={draftId}
        onChangeDraft={setDraftId}
        onConfirm={confirmPicker}
        onClose={closePicker}
        isTablet={isTablet}
        bottomInset={insets.bottom}
      />
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  toolbarTablet: {
    paddingHorizontal: 26,
    paddingBottom: 14,
    gap: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: AppColors.cardBg,
  },
  searchRowTablet: {
    paddingVertical: 14,
    borderRadius: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: AppColors.cardText,
    padding: 0,
  },
  searchInputTablet: {
    fontSize: 17,
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
  },
  filterField: {
    flex: 1,
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  filterFieldTablet: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  filterFieldLabel: {
    color: "rgba(52, 61, 72, 0.55)",
    fontSize: 12,
    fontFamily: "PoppinsMedium",
  },
  filterFieldLabelTablet: {
    fontSize: 13,
  },
  filterFieldValue: {
    color: AppColors.heading,
    fontSize: 15,
    fontFamily: "PoppinsBold",
  },
  filterFieldValueTablet: {
    fontSize: 17,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetDismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "78%",
    paddingTop: 8,
  },
  sheetTablet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(52, 61, 72, 0.18)",
    marginBottom: 12,
  },
  sheetTitle: {
    color: AppColors.heading,
    fontSize: 18,
    fontFamily: "PoppinsBold",
    textAlign: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  sheetTitleTablet: {
    fontSize: 20,
    paddingBottom: 16,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetList: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 8,
  },
  sheetListTablet: {
    paddingHorizontal: 26,
    gap: 12,
  },
  sheetItem: {
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: AppColors.cardBg,
    justifyContent: "center",
  },
  sheetItemTablet: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  sheetItemActive: {
    backgroundColor: AppColors.accent,
  },
  sheetItemText: {
    color: AppColors.heading,
    fontSize: 16,
    fontFamily: "PoppinsSemiBold",
  },
  sheetItemTextTablet: {
    fontSize: 18,
  },
  sheetItemTextActive: {
    color: AppColors.navText,
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: AppColors.background,
  },
  sheetFooterTablet: {
    paddingHorizontal: 26,
  },
  sheetConfirmButton: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: AppColors.secondaryButton,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetConfirmButtonTablet: {
    minHeight: 44,
    borderRadius: 10,
  },
  sheetConfirmText: {
    color: AppColors.navText,
    fontSize: 16,
    fontFamily: "PoppinsBold",
  },
  sheetConfirmTextTablet: {
    fontSize: 18,
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
