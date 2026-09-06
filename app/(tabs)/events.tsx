import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EventCardImage,
  prefetchEventImages,
} from "../components/EventCardImage";
import { useAuth } from "../context/AuthContext";
import { AppColors } from "../../constants/colors";
import { appRefreshControl } from "../../lib/appRefreshControl";
import { formatVenueLine } from "../../lib/formatVenueLine";
import { useTranslation } from "../context/LocaleContext";
import {
  fetchBrowsableCategories,
  fetchCategories,
  type CategoryItem,
} from "../../lib/definitions";
import {
  buildEventFilterParams,
  getEventFilterKey,
  parseEventFilterParams,
} from "../../lib/eventFilters";
import {
  eventsTabPath,
  useTabGroup,
} from "../../lib/navigation";
import { useIsTablet } from "../../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";
import {
  EventItem,
  eventImageCacheKey,
  fetchAdminEventsList,
  fetchUpcomingEvents,
  formatEventDateLong,
  formatEventTime,
  isPastEvent,
  managerScopeFromUser,
} from "../../lib/events";

const EVENT_CARD_IMAGE_WIDTH = { phone: 128, tablet: 156 };
const EVENT_CARD_MIN_HEIGHT = { phone: 128, tablet: 148 };

function getEventCategoryLabel(
  event: EventItem,
  categoryLabels: Record<string, string>,
): string {
  if (event.category && categoryLabels[event.category]) {
    return categoryLabels[event.category];
  }
  return event.categoryLabel?.trim() || event.category?.trim() || "";
}

function EventInfoRow({
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

function EventsCategoryFilter({
  categories,
  selectedCategory,
  loading,
  isTablet,
  onSelect,
  onFilterPress,
  onSearchPress,
}: {
  categories: CategoryItem[];
  selectedCategory?: string;
  loading: boolean;
  isTablet: boolean;
  onSelect: (value: string) => void;
  onFilterPress: () => void;
  onSearchPress: () => void;
}) {
  const scrollContentStyle = [
    styles.categoryScrollContent,
    isTablet && styles.categoryScrollContentTablet,
  ];

  if (loading) {
    return (
      <View style={[styles.categoryBar, isTablet && styles.categoryBarTablet]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={scrollContentStyle}
          style={styles.categoryScroll}
        >
          {Array.from({ length: 4 }).map((_, idx) => (
            <View
              key={`cat-skel-${idx}`}
              style={[
                styles.categoryChipSkeleton,
                isTablet && styles.categoryChipSkeletonTablet,
              ]}
            />
          ))}
        </ScrollView>
        <View style={styles.categoryActions}>
          <View style={styles.filterButtonSkeleton} />
          <View style={styles.filterButtonSkeleton} />
        </View>
      </View>
    );
  }

  if (categories.length === 0) return null;

  return (
    <View style={[styles.categoryBar, isTablet && styles.categoryBarTablet]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={scrollContentStyle}
        style={styles.categoryScroll}
      >
        {categories.map((cat) => {
          const active = selectedCategory === cat.value;
          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.85}
              onPress={() => onSelect(cat.value)}
              style={[
                styles.categoryChip,
                isTablet && styles.categoryChipTablet,
                active && styles.categoryChipActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  isTablet && styles.categoryChipTextTablet,
                  active && styles.categoryChipTextActive,
                ]}
                numberOfLines={1}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.categoryActions}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onFilterPress}
          style={[
            styles.categoryActionButton,
            isTablet && styles.categoryActionButtonTablet,
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Ionicons
            name="funnel-outline"
            size={isTablet ? 28 : 26}
            color={AppColors.cardText}
          />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onSearchPress}
          style={[
            styles.categoryActionButton,
            isTablet && styles.categoryActionButtonTablet,
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Ionicons
            name="search-outline"
            size={isTablet ? 28 : 26}
            color={AppColors.cardText}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EventsEmptyState({
  hasFilters,
  isTablet,
  onClearFilters,
}: {
  hasFilters: boolean;
  isTablet: boolean;
  onClearFilters: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyCard, isTablet && styles.emptyCardTablet]}>
        <View
          style={[styles.emptyIconWrap, isTablet && styles.emptyIconWrapTablet]}
        >
          <Ionicons
            name="search"
            size={isTablet ? 34 : 30}
            color={AppColors.cardText}
          />
        </View>
        <Text style={[styles.emptyTitle, isTablet && styles.emptyTitleTablet]}>
          {hasFilters ? t("noEventsFilter") : t("noUpcomingEvents")}
        </Text>
        <Text
          style={[styles.emptySubtitle, isTablet && styles.emptySubtitleTablet]}
        >
          {hasFilters ? t("noEventsFilterHint") : t("noUpcomingEventsHint")}
        </Text>
        {hasFilters ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onClearFilters}
            style={[styles.emptyAction, isTablet && styles.emptyActionTablet]}
          >
            <Text
              style={[
                styles.emptyActionText,
                isTablet && styles.emptyActionTextTablet,
              ]}
            >
              {t("clearFilters")}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default function EventsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const tabGroup = useTabGroup();
  const eventsPath = eventsTabPath(tabGroup);
  const { user } = useAuth();
  const isAdminMode = tabGroup === "(admin-tabs)" && !!user?.isSaleMode;
  const rawParams = useLocalSearchParams<Record<string, string | string[]>>();
  const filterKey = getEventFilterKey(rawParams);
  const filters = useMemo(() => parseEventFilterParams(rawParams), [filterKey]);
  const { category } = filters;
  const hasActiveFilters = useMemo(
    () =>
      !!(
        filters.category ||
        filters.subcategory ||
        filters.city ||
        filters.venue ||
        filters.date ||
        filters.onlyCampaigns
      ),
    [filters],
  );
  const isTablet = useIsTablet();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>(
    {},
  );
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async (refresh?: boolean) => {
    try {
      const [browsable, all] = await Promise.all([
        fetchBrowsableCategories(refresh === true),
        fetchCategories(refresh === true),
      ]);
      setCategories(browsable);
      setCategoryLabels(
        Object.fromEntries(all.map((c) => [c.value, c.label])),
      );
    } catch {
      setCategories([]);
      setCategoryLabels({});
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const managerScope = useMemo(
    () => (isAdminMode && user ? managerScopeFromUser(user) : {}),
    [isAdminMode, user],
  );

  const loadEvents = useCallback(
    async (options?: { silent?: boolean; refresh?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) setEventsLoading(true);
      setError(null);
      try {
        const baseFilters = {
          category: filters.category,
          city: filters.city,
          venueId: filters.venue,
          perPage: 50,
          forAdmin: isAdminMode,
          ...managerScope,
        };
        const res = isAdminMode
          ? await fetchAdminEventsList(baseFilters, {
              includePast: showPastEvents,
              pastMonths: 1,
              refresh: options?.refresh,
              clientFilters: filters,
            })
          : await fetchUpcomingEvents(baseFilters, {
              refresh: options?.refresh,
              clientFilters: filters,
            });
        setEvents(res.items);
        void prefetchEventImages(res.items);
      } catch {
        setError(t("eventsLoadError"));
      } finally {
        if (!silent) setEventsLoading(false);
      }
    },
    [filterKey, filters, managerScope, showPastEvents, isAdminMode],
  );

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadCategories(true),
        loadEvents({ silent: true, refresh: true }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [loadCategories, loadEvents]);

  const onCategorySelect = useCallback(
    (value: string) => {
      const nextCategory = category === value ? undefined : value;
      const nextFilters = {
        ...filters,
        category: nextCategory,
        subcategory:
          nextCategory && nextCategory === filters.category
            ? filters.subcategory
            : undefined,
      };
      router.replace({
        pathname: eventsPath,
        params: buildEventFilterParams(nextFilters),
      });
    },
    [category, filters, router, eventsPath],
  );

  const onFilterPress = useCallback(() => {
    router.push({
      pathname: "/events-filter",
      params: buildEventFilterParams(filters),
    });
  }, [filters, router]);

  const onSearchPress = useCallback(() => {
    router.push({
      pathname: "/search",
      params: { scope: "events" },
    } as import("expo-router").Href);
  }, [router]);

  const onClearFilters = useCallback(() => {
    router.replace(eventsPath);
  }, [router, eventsPath]);

  const contentStyle = {
    paddingHorizontal: isTablet ? 26 : 20,
    paddingTop: isTablet ? 14 : 12,
    gap: isTablet ? 16 : 12,
    paddingBottom: isTablet ? 150 : 120,
    flexGrow: 1,
  };

  const refreshCtrl = appRefreshControl(refreshing, onRefresh);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <Text style={[styles.pageTitle, isTablet && styles.pageTitleTablet]}>
          Etkinlikler
        </Text>
      </View>

      <EventsCategoryFilter
        categories={categories}
        selectedCategory={category}
        loading={categoriesLoading}
        isTablet={isTablet}
        onSelect={onCategorySelect}
        onFilterPress={onFilterPress}
        onSearchPress={onSearchPress}
      />

      {isAdminMode ? (
        <View
          style={[
            styles.adminToggleWrap,
            isTablet && styles.adminToggleWrapTablet,
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowPastEvents((prev) => !prev)}
          >
            <Text
              style={[
                styles.adminToggleText,
                isTablet && styles.adminToggleTextTablet,
              ]}
            >
              {showPastEvents
                ? t("hidePastEvents")
                : t("showPastEvents")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {eventsLoading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentStyle}
          refreshControl={refreshCtrl}
        >
          {Array.from({ length: 5 }).map((_, idx) => (
            <View key={`events-page-skeleton-${idx}`} style={styles.eventCard}>
              <View
                style={[
                  styles.skeletonImage,
                  {
                    width: isTablet
                      ? EVENT_CARD_IMAGE_WIDTH.tablet
                      : EVENT_CARD_IMAGE_WIDTH.phone,
                    minHeight: isTablet
                      ? EVENT_CARD_MIN_HEIGHT.tablet
                      : EVENT_CARD_MIN_HEIGHT.phone,
                  },
                ]}
              />
              <View
                style={[
                  styles.eventCardBody,
                  isTablet && styles.eventCardBodyTablet,
                ]}
              >
                <View className="h-3 w-[36%] rounded bg-[#E8ECF0]" />
                <View className="h-4 w-[88%] rounded bg-[#E8ECF0] mt-2" />
                <View className="h-px w-full rounded bg-[#E8ECF0] mt-2" />
                <View className="h-3 w-[72%] rounded bg-[#E8ECF0] mt-2" />
                <View className="h-3 w-[58%] rounded bg-[#E8ECF0] mt-1.5" />
                <View className="h-3 w-[28%] rounded bg-[#E8ECF0] mt-1.5" />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : error ? (
        <ScrollView
          contentContainerStyle={[contentStyle, { justifyContent: "center" }]}
          refreshControl={refreshCtrl}
        >
          <Text className="text-app-navy text-center">{error}</Text>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            contentStyle,
            events.length === 0 && styles.emptyContent,
          ]}
          refreshControl={refreshCtrl}
        >
          {events.length === 0 ? (
            <EventsEmptyState
              hasFilters={hasActiveFilters}
              isTablet={isTablet}
              onClearFilters={onClearFilters}
            />
          ) : (
            events.map((event) => {
              const categoryLabel = getEventCategoryLabel(
                event,
                categoryLabels,
              );
              const isPast = isPastEvent(event);
              const imageWidth = isTablet
                ? EVENT_CARD_IMAGE_WIDTH.tablet
                : EVENT_CARD_IMAGE_WIDTH.phone;
              const cardMinHeight = isTablet
                ? EVENT_CARD_MIN_HEIGHT.tablet
                : EVENT_CARD_MIN_HEIGHT.phone;
              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push(
                      isAdminMode
                        ? (`/admin/events/${event.id}` as import("expo-router").Href)
                        : `/events/${event.id}`,
                    )
                  }
                >
                  <View
                    style={[
                      styles.eventImageWrap,
                      { width: imageWidth, minHeight: cardMinHeight },
                    ]}
                  >
                    <EventCardImage
                      imageUrl={event.imageUrl}
                      cacheKey={eventImageCacheKey(event)}
                      recyclingKey={event.id}
                      contentFit="cover"
                      style={[
                        styles.eventCardImage,
                        { width: imageWidth, minHeight: cardMinHeight },
                      ]}
                    />
                    {isPast ? (
                      <>
                        <View style={styles.pastOverlay} />
                        <Text
                          style={[
                            styles.pastLabel,
                            isTablet && styles.pastLabelTablet,
                          ]}
                        >
                          {t("pastEventBadge")}
                        </Text>
                      </>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.eventCardBody,
                      isTablet && styles.eventCardBodyTablet,
                    ]}
                  >
                    {categoryLabel ? (
                      <Text
                        style={[
                          styles.category,
                          isTablet && styles.categoryTablet,
                        ]}
                        numberOfLines={1}
                      >
                        {categoryLabel}
                      </Text>
                    ) : null}
                    <Text
                      style={[styles.title, isTablet && styles.titleTablet]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {event.title}
                    </Text>
                    <View style={styles.titleDivider} />
                    <View style={styles.infoList}>
                      <EventInfoRow
                        icon="location"
                        label={formatVenueLine(event)}
                        isTablet={isTablet}
                      />
                      <EventInfoRow
                        icon="calendar"
                        label={formatEventDateLong(event.startsAt)}
                        isTablet={isTablet}
                      />
                      <EventInfoRow
                        icon="time"
                        label={formatEventTime(event.startsAt)}
                        isTablet={isTablet}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTablet: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 12,
  },
  pageTitle: {
    color: "#000000",
    fontSize: 20,
    fontFamily: "PoppinsSemiBold",
  },
  pageTitleTablet: {
    fontSize: 26,
  },
  categoryBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
    paddingBottom: 10,
    gap: 8,
  },
  categoryBarTablet: {
    paddingRight: 20,
    paddingBottom: 12,
    gap: 10,
  },
  adminToggleWrap: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  adminToggleWrapTablet: {
    paddingHorizontal: 26,
    paddingBottom: 10,
  },
  adminToggleText: {
    color: AppColors.accent,
    fontSize: 14,
    fontFamily: "PoppinsSemiBold",
  },
  adminToggleTextTablet: {
    fontSize: 15,
  },
  categoryScroll: {
    flex: 1,
  },
  categoryScrollContent: {
    gap: 8,
    paddingLeft: 20,
    paddingRight: 8,
  },
  categoryScrollContentTablet: {
    gap: 10,
    paddingLeft: 26,
    paddingRight: 10,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 7,
    backgroundColor: AppColors.cardBg,
    borderWidth: 1,
    borderColor: "rgba(52, 61, 72, 0.1)",
  },
  categoryChipTablet: {
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  categoryChipActive: {
    backgroundColor: AppColors.accent,
    borderColor: AppColors.accent,
  },
  categoryChipText: {
    color: AppColors.cardText,
    fontSize: 14,
    fontFamily: "PoppinsSemiBold",
  },
  categoryChipTextTablet: {
    fontSize: 16,
  },
  categoryChipTextActive: {
    color: AppColors.navText,
  },
  categoryChipSkeleton: {
    width: 98,
    height: 40,
    borderRadius: 7,
    backgroundColor: "#E8ECF0",
  },
  categoryChipSkeletonTablet: {
    width: 118,
    height: 46,
  },
  categoryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryActionButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  categoryActionButtonTablet: {
    paddingHorizontal: 4,
  },
  filterButtonSkeleton: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#E8ECF0",
  },
  eventCard: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "stretch",
  },
  eventCardImage: {
    alignSelf: "stretch",
    backgroundColor: "#E8ECF0",
  },
  eventImageWrap: {
    position: "relative",
    alignSelf: "stretch",
    overflow: "hidden",
    borderRadius: 0,
  },
  pastOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
  },
  pastLabel: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 10,
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "PoppinsBold",
    textAlign: "center",
  },
  pastLabelTablet: {
    fontSize: 13,
  },
  skeletonImage: {
    alignSelf: "stretch",
    backgroundColor: "#E8ECF0",
  },
  eventCardBody: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 12,
    justifyContent: "center",
  },
  eventCardBodyTablet: {
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 14,
  },
  category: {
    color: AppColors.accent,
    fontSize: 13,
    fontFamily: "PoppinsRegular",
    lineHeight: 17,
    marginBottom: 2,
  },
  categoryTablet: {
    fontSize: 15,
    lineHeight: 20,
  },
  title: {
    color: AppColors.heading,
    fontSize: 15,
    fontFamily: "PoppinsSemiBold",
    lineHeight: 19,
  },
  titleTablet: {
    fontSize: 17,
    lineHeight: 22,
  },
  titleDivider: {
    height: 1,
    backgroundColor: "rgba(52, 61, 72, 0.1)",
    marginTop: 6,
    marginBottom: 4,
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
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 20,
  },
  emptyCard: {
    width: "100%",
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
  },
  emptyCardTablet: {
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 36,
  },
  emptyIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyIconWrapTablet: {
    marginBottom: 18,
  },
  emptyTitle: {
    color: AppColors.heading,
    fontSize: 16,
    fontFamily: "PoppinsBold",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyTitleTablet: {
    fontSize: 18,
    lineHeight: 24,
  },
  emptySubtitle: {
    marginTop: 8,
    color: "rgba(52, 61, 72, 0.65)",
    fontSize: 13,
    fontFamily: "PoppinsMedium",
    textAlign: "center",
    lineHeight: 18,
  },
  emptySubtitleTablet: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyAction: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: AppColors.accent,
  },
  emptyActionTablet: {
    marginTop: 22,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyActionText: {
    color: AppColors.navText,
    fontSize: 14,
    fontFamily: "PoppinsBold",
  },
  emptyActionTextTablet: {
    fontSize: 15,
  },
});
