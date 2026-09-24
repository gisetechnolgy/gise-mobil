import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import HomeEventCard from "../components/HomeEventCard";
import { prefetchEventImages } from "../components/_EventCardImage";
import HomeEventHorizontalCard from "../components/detail/HomeEventHorizontalCard";
import HomeSectionViewToggle, {
  type HomeViewMode,
} from "../components/HomeSectionViewToggle";
import MobileHomeHeader from "../components/MobileHomeHeader";
import MobileSearchSheet from "../components/MobileSearchSheet";
import { useAuth } from "../context/AuthContext";
import { useDrawer } from "../context/DrawerContext";
import { useNotificationsPanel } from "../context/NotificationContext";
import { AppColors } from "../../constants/colors";
import { PAGE_GUTTER } from "../../constants/homeSection";
import { appRefreshControl } from "../../lib/appRefreshControl";
import { useTranslation } from "../context/_LocaleContext";
import { formatCategoryMenuLabel } from "../../lib/categoryIcons";
import {
  fetchBrowsableCategories,
  type CategoryItem,
} from "../../lib/definitions";
import { CITY_OPTIONS, formatCityLabel } from "../../lib/cities";
import {
  buildEventFilterParams,
  EVENT_DATE_OPTIONS,
  getEventFilterKey,
  parseEventFilterParams,
  type EventDateFilter,
  type EventFilterParams,
} from "../../lib/eventFilters";
import {
  eventsTabPath,
  useTabGroup,
} from "../../lib/navigation";
import { useIsTablet } from "../../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";
import { CategoryIcon } from "@/components/icons/CategoryIcon";
import {
  EventItem,
  fetchAdminEventsList,
  fetchUpcomingEvents,
  managerScopeFromUser,
} from "../../lib/events";
import { fetchVenues, type VenueItem } from "../../lib/venues";
import {
  enrichEventsWithPriceInfo,
  type ActivePriceInfo,
} from "../../lib/startingPrice";

const MOBILE_CAT_GAP = 8;
const MOBILE_CAT_VISIBLE = 3.5;
const MOBILE_CAT_ICON = 30;

type EventsListItem = EventItem & { priceInfo?: ActivePriceInfo | null };
type SortKey = "dateAsc" | "nameAsc" | "nameDesc";
type FilterPickerKey = "venue" | "date" | "city" | null;

function sortEventsList(events: EventItem[], sortKey: SortKey): EventItem[] {
  const list = [...events];
  switch (sortKey) {
    case "nameAsc":
      return list.sort((a, b) =>
        (a.title || "").localeCompare(b.title || "", "tr", {
          sensitivity: "base",
        }),
      );
    case "nameDesc":
      return list.sort((a, b) =>
        (b.title || "").localeCompare(a.title || "", "tr", {
          sensitivity: "base",
        }),
      );
    case "dateAsc":
    default:
      return list.sort((a, b) => {
        const ta = a.startsAt ? new Date(a.startsAt).getTime() : 0;
        const tb = b.startsAt ? new Date(b.startsAt).getTime() : 0;
        return ta - tb;
      });
  }
}

function EventsCategoryFilter({
  categories,
  selectedCategory,
  loading,
  onSelect,
}: {
  categories: CategoryItem[];
  selectedCategory?: string;
  loading: boolean;
  onSelect: (value: string) => void;
}) {
  const { t } = useTranslation();
  const { width: screenW } = useWindowDimensions();
  const cardInner = Math.max(0, screenW - 24 - 20);
  const itemW = Math.max(
    72,
    (cardInner - (MOBILE_CAT_VISIBLE - 1) * MOBILE_CAT_GAP) / MOBILE_CAT_VISIBLE,
  );

  const items: {
    id: string;
    value: string;
    label: string;
    category: "all" | CategoryItem;
  }[] = [
    {
      id: "all",
      value: "all",
      label: formatCategoryMenuLabel(t("allCategories")),
      category: "all",
    },
    ...categories.map((c) => ({
      id: c.id,
      value: c.value,
      label: formatCategoryMenuLabel(c.label),
      category: c,
    })),
  ];

  if (loading) {
    return (
      <View style={styles.categoriesSection}>
        <View style={styles.categoriesCard}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: MOBILE_CAT_GAP }}
          >
            {Array.from({ length: 4 }).map((_, idx) => (
              <View
                key={`cat-skel-${idx}`}
                style={[styles.categoryChipSkeleton, { width: itemW }]}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  if (categories.length === 0) return null;

  return (
    <View style={styles.categoriesSection}>
      <View style={styles.categoriesCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          contentContainerStyle={{ gap: MOBILE_CAT_GAP }}
        >
          {items.map((item) => {
            const active =
              item.value === "all"
                ? !selectedCategory || selectedCategory === "all"
                : selectedCategory === item.value;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                onPress={() => onSelect(item.value)}
                style={[styles.categoryItem, { width: itemW }]}
              >
                <View style={styles.categoryIconWrap}>
                  <CategoryIcon
                    category={item.category}
                    size={MOBILE_CAT_ICON}
                    active={active}
                  />
                </View>
                <Text
                  style={[
                    styles.categoryItemLabel,
                    active && styles.categoryItemLabelActive,
                  ]}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

function EventsToolbar({
  sortKey,
  onSortPress,
  filterActiveCount,
  filtersOpen,
  onFilterToggle,
  viewMode,
  onViewChange,
  searchTerm,
  onClearSearch,
}: {
  sortKey: SortKey;
  onSortPress: () => void;
  filterActiveCount: number;
  filtersOpen: boolean;
  onFilterToggle: () => void;
  viewMode: HomeViewMode;
  onViewChange: (mode: HomeViewMode) => void;
  searchTerm?: string;
  onClearSearch?: () => void;
}) {
  const { t } = useTranslation();
  const sortLabel =
    sortKey === "nameAsc"
      ? t("sortByNameAsc")
      : sortKey === "nameDesc"
        ? t("sortByNameDesc")
        : t("sort");

  return (
    <View style={styles.toolbarBlock}>
      {searchTerm ? (
        <View style={styles.searchChipRow}>
          <View style={styles.searchChip} accessibilityRole="text">
            <Text style={styles.searchChipLabel} numberOfLines={1}>
              {t("searchedKeyword")}
            </Text>
            <Text style={styles.searchChipText} numberOfLines={1}>
              {searchTerm}
            </Text>
            <TouchableOpacity
              onPress={onClearSearch}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("close")}
              style={styles.searchChipClear}
            >
              <Ionicons name="close" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={styles.toolbar}>
        <TouchableOpacity
          onPress={onSortPress}
          style={[styles.toolChip, styles.sortChip]}
          activeOpacity={0.85}
        >
          <Text
            style={[styles.toolChipText, styles.sortChipText]}
            numberOfLines={1}
          >
            {sortLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#1A1A1A" />
        </TouchableOpacity>

        <View style={styles.toolbarSpacer} />

        <TouchableOpacity
          onPress={onFilterToggle}
          style={[styles.toolChip, filtersOpen && styles.toolChipOpen]}
          activeOpacity={0.85}
        >
          <Text
            style={[styles.toolChipText, filtersOpen && styles.toolChipTextOpen]}
            numberOfLines={1}
          >
            {t("filter")}
            {filterActiveCount > 0 ? ` (${filterActiveCount})` : ""}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={filtersOpen ? AppColors.accent : "#1A1A1A"}
          />
        </TouchableOpacity>

        <HomeSectionViewToggle
          view={viewMode}
          onChange={onViewChange}
          height={34}
        />
      </View>
    </View>
  );
}

/** Web mobil filtre grid: mekan | tarih | şehir */
function EventsInlineFilters({
  filters,
  venues,
  onOpenPicker,
}: {
  filters: EventFilterParams;
  venues: VenueItem[];
  onOpenPicker: (key: Exclude<FilterPickerKey, null>) => void;
}) {
  const { t } = useTranslation();
  const venueLabel =
    venues.find((v) => v.id === filters.venue)?.name || t("selectVenue");
  const dateLabel = filters.date
    ? EVENT_DATE_OPTIONS.find((o) => o.value === filters.date)?.label ||
      t("selectDate")
    : t("selectDate");
  const cityLabel = filters.city
    ? formatCityLabel(filters.city) || filters.city
    : t("selectCity");

  return (
    <View style={styles.filterGrid}>
      <TouchableOpacity
        style={styles.filterCell}
        onPress={() => onOpenPicker("venue")}
        activeOpacity={0.85}
      >
        <Text style={styles.filterCellText} numberOfLines={1}>
          {venueLabel}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#1A1A1A" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.filterCell}
        onPress={() => onOpenPicker("date")}
        activeOpacity={0.85}
      >
        <Text style={styles.filterCellText} numberOfLines={1}>
          {dateLabel}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#1A1A1A" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.filterCell}
        onPress={() => onOpenPicker("city")}
        activeOpacity={0.85}
      >
        <Text style={styles.filterCellText} numberOfLines={1}>
          {cityLabel}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#1A1A1A" />
      </TouchableOpacity>
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
  const { openDrawer } = useDrawer();
  const {
    openNotifications,
    unreadCount,
  } = useNotificationsPanel();
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
        filters.onlyCampaigns ||
        filters.q
      ),
    [filters],
  );
  const isTablet = useIsTablet();
  const [events, setEvents] = useState<EventsListItem[]>([]);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<HomeViewMode>("grid");
  const [sortKey, setSortKey] = useState<SortKey>("dateAsc");
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterPicker, setFilterPicker] = useState<FilterPickerKey>(null);
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [headerHeight, setHeaderHeight] = useState(0);

  const filterActiveCount = useMemo(
    () =>
      [filters.date, filters.venue, filters.city, filters.subcategory].filter(
        (v) => v && v !== "all",
      ).length + (filters.onlyCampaigns ? 1 : 0),
    [filters],
  );

  const sortedEvents = useMemo(
    () => sortEventsList(events, sortKey),
    [events, sortKey],
  );

  const loadCategories = useCallback(async (refresh?: boolean) => {
    try {
      const browsable = await fetchBrowsableCategories(refresh === true);
      setCategories(browsable);
    } catch {
      setCategories([]);
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
          q: filters.q,
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
        const withPrices = await enrichEventsWithPriceInfo(res.items);
        setEvents(withPrices);
        void prefetchEventImages(withPrices);
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

  useEffect(() => {
    if (!filtersOpen || venues.length > 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchVenues();
        if (!cancelled) setVenues(list);
      } catch {
        if (!cancelled) setVenues([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filtersOpen, venues.length]);

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
      const nextCategory =
        value === "all" || category === value ? undefined : value;
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

  const onFilterToggle = useCallback(() => {
    setFiltersOpen((v) => !v);
  }, []);

  const patchFilters = useCallback(
    (patch: Partial<EventFilterParams>) => {
      const next: EventFilterParams = { ...filters, ...patch };
      router.replace({
        pathname: eventsPath,
        params: buildEventFilterParams(next),
      });
    },
    [filters, router, eventsPath],
  );

  const onClearFilters = useCallback(() => {
    router.replace(eventsPath);
  }, [router, eventsPath]);

  const onClearSearch = useCallback(() => {
    const { q: _removed, ...rest } = filters;
    router.replace({
      pathname: eventsPath,
      params: buildEventFilterParams(rest),
    });
  }, [filters, router, eventsPath]);

  const onSearchSubmit = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) {
        const { q: _drop, ...rest } = filters;
        router.replace({
          pathname: eventsPath,
          params: buildEventFilterParams(rest),
        });
        return;
      }
      router.replace({
        pathname: eventsPath,
        params: buildEventFilterParams({ ...filters, q }),
      });
    },
    [filters, router, eventsPath],
  );

  const filterPickerItems = useMemo(() => {
    if (filterPicker === "date") {
      return EVENT_DATE_OPTIONS.map((o) => ({
        id: o.value || "all",
        label: o.label,
      }));
    }
    if (filterPicker === "city") {
      return [
        { id: "all", label: t("all") },
        ...CITY_OPTIONS.map((c) => ({ id: c.value, label: c.label })),
      ];
    }
    if (filterPicker === "venue") {
      return [
        { id: "all", label: t("all") },
        ...venues.map((v) => ({ id: v.id, label: v.name })),
      ];
    }
    return [];
  }, [filterPicker, venues, t]);

  const filterPickerSelected =
    filterPicker === "date"
      ? filters.date || "all"
      : filterPicker === "city"
        ? filters.city || "all"
        : filterPicker === "venue"
          ? filters.venue || "all"
          : "";

  const applyFilterPicker = (id: string) => {
    if (filterPicker === "date") {
      patchFilters({
        date: id === "all" ? undefined : (id as EventDateFilter),
      });
    } else if (filterPicker === "city") {
      patchFilters({ city: id === "all" ? undefined : id });
    } else if (filterPicker === "venue") {
      patchFilters({ venue: id === "all" ? undefined : id });
    }
    setFilterPicker(null);
  };

  const contentStyle = {
    paddingBottom: 120,
    flexGrow: 1,
  };

  const listPadStyle = {
    paddingHorizontal: PAGE_GUTTER,
    paddingTop: 12,
    gap: 12,
  };

  const refreshCtrl = appRefreshControl(refreshing, onRefresh);

  const pageChrome = (
    <>
      <View style={styles.pageTitleRow}>
        <Text style={styles.pageTitle}>{t("events")}</Text>
      </View>

      <EventsCategoryFilter
        categories={categories}
        selectedCategory={category}
        loading={categoriesLoading}
        onSelect={onCategorySelect}
      />

      <View style={styles.toolbarWrap}>
        <EventsToolbar
          sortKey={sortKey}
          onSortPress={() => setSortOpen(true)}
          filterActiveCount={filterActiveCount}
          filtersOpen={filtersOpen}
          onFilterToggle={onFilterToggle}
          viewMode={viewMode}
          onViewChange={setViewMode}
          searchTerm={filters.q}
          onClearSearch={onClearSearch}
        />
        {filtersOpen ? (
          <EventsInlineFilters
            filters={filters}
            venues={venues}
            onOpenPicker={setFilterPicker}
          />
        ) : null}
      </View>

      {isAdminMode ? (
        <View style={styles.adminToggleWrap}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowPastEvents((prev) => !prev)}
          >
            <Text style={styles.adminToggleText}>
              {showPastEvents ? t("hidePastEvents") : t("showPastEvents")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </>
  );

  return (
    <View style={styles.safe}>
      <MobileHomeHeader
        onMenuPress={openDrawer}
        onNotificationPress={openNotifications}
        notificationUnreadCount={unreadCount}
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        onSearchOpenChange={setSearchOpen}
        onSearchQueryChange={setSearchQuery}
        onSearchSubmit={onSearchSubmit}
        onHeaderHeightChange={setHeaderHeight}
      />

      {eventsLoading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentStyle}
          refreshControl={refreshCtrl}
          scrollEnabled={!searchOpen}
        >
          {pageChrome}
          <View style={listPadStyle}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <View
                key={`events-page-skeleton-${idx}`}
                style={styles.skelCard}
              />
            ))}
          </View>
        </ScrollView>
      ) : error ? (
        <ScrollView
          contentContainerStyle={contentStyle}
          refreshControl={refreshCtrl}
          scrollEnabled={!searchOpen}
        >
          {pageChrome}
          <View style={[listPadStyle, { justifyContent: "center", flexGrow: 1 }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            contentStyle,
            sortedEvents.length === 0 && styles.emptyContent,
          ]}
          refreshControl={refreshCtrl}
          scrollEnabled={!searchOpen}
        >
          {pageChrome}
          <View
            style={[
              listPadStyle,
              sortedEvents.length === 0 && { flexGrow: 1 },
            ]}
          >
            {sortedEvents.length === 0 ? (
              <EventsEmptyState
                hasFilters={hasActiveFilters}
                isTablet={isTablet}
                onClearFilters={onClearFilters}
              />
            ) : viewMode === "list" ? (
              sortedEvents.map((event, index) => (
                <HomeEventHorizontalCard
                  key={`${event.id}-${index}`}
                  event={event}
                  href={
                    isAdminMode
                      ? (`/admin/events/${event.id}` as import("expo-router").Href)
                      : undefined
                  }
                />
              ))
            ) : (
              <View style={styles.gridWrap}>
                {sortedEvents.map((event, index) => (
                  <HomeEventCard
                    key={`${event.id}-${index}`}
                    event={event}
                    fluid
                    href={
                      isAdminMode
                        ? (`/admin/events/${event.id}` as import("expo-router").Href)
                        : undefined
                    }
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <MobileSearchSheet
        visible={searchOpen}
        topOffset={headerHeight}
        query={searchQuery}
        scope="all"
      />

      <Modal
        visible={sortOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortOpen(false)}
      >
        <Pressable style={styles.sortOverlay} onPress={() => setSortOpen(false)}>
          <Pressable style={styles.sortSheet} onPress={() => {}}>
            {(
              [
                ["dateAsc", t("sortByDate")],
                ["nameAsc", t("sortByNameAsc")],
                ["nameDesc", t("sortByNameDesc")],
              ] as const
            ).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.sortOption,
                  sortKey === key && styles.sortOptionActive,
                ]}
                onPress={() => {
                  setSortKey(key);
                  setSortOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortKey === key && styles.sortOptionTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={filterPicker != null}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterPicker(null)}
      >
        <Pressable
          style={styles.sortOverlay}
          onPress={() => setFilterPicker(null)}
        >
          <Pressable style={styles.sortSheet} onPress={() => {}}>
            <ScrollView style={{ maxHeight: 360 }}>
              {filterPickerItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.sortOption,
                    filterPickerSelected === item.id && styles.sortOptionActive,
                  ]}
                  onPress={() => applyFilterPicker(item.id)}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      filterPickerSelected === item.id &&
                        styles.sortOptionTextActive,
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
    </View>
  );
}
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.sectionBg,
  },
  pageTitleRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 0,
    backgroundColor: AppColors.sectionBg,
  },
  pageTitle: {
    color: "#000000",
    fontSize: 22,
    fontFamily: "PoppinsSemiBold",
  },
  categoriesSection: {
    backgroundColor: AppColors.sectionBg,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  categoriesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    overflow: "hidden",
  },
  categoryItem: {
    alignItems: "center",
    gap: 6,
  },
  categoryIconWrap: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryItemLabel: {
    fontFamily: "PoppinsBold",
    fontSize: 12,
    lineHeight: 15,
    color: "#2D2D2D",
    textAlign: "center",
    textTransform: "uppercase",
    minHeight: 30,
  },
  categoryItemLabelActive: {
    color: AppColors.accent,
  },
  categoryChipSkeleton: {
    height: 72,
    borderRadius: 10,
    backgroundColor: "#E8ECF0",
  },
  toolbarWrap: {
    backgroundColor: AppColors.sectionBg,
    paddingHorizontal: PAGE_GUTTER,
    paddingBottom: 8,
  },
  toolbarBlock: {
    gap: 8,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 34,
  },
  toolbarSpacer: {
    flex: 1,
    minWidth: 0,
  },
  searchChipRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  searchChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 34,
    maxWidth: "100%",
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D8DDE3",
    backgroundColor: "#FFFFFF",
    flexShrink: 1,
    minWidth: 0,
  },
  searchChipLabel: {
    fontFamily: "PoppinsMedium",
    fontSize: 10,
    color: "#6B7280",
    flexShrink: 0,
  },
  searchChipText: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 11,
    color: "#1A1A1A",
    flexShrink: 1,
    minWidth: 0,
    maxWidth: 160,
  },
  searchChipClear: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  toolChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D8DDE3",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  sortChip: {
    height: 34,
    paddingLeft: 14,
    paddingRight: 14,
    minWidth: 114,
  },
  sortChipText: {
    flex: 1,
    minWidth: 0,
    textAlign: "left",
  },
  toolChipText: {
    fontFamily: "PoppinsBold",
    fontSize: 12,
    color: "#1A1A1A",
  },
  toolChipOpen: {
    borderColor: AppColors.accent,
    backgroundColor: "#FAF5F8",
  },
  toolChipTextOpen: {
    color: AppColors.accent,
  },
  filterGrid: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
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
  toolBadge: {
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: AppColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  toolBadgeText: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: 10,
    lineHeight: 12,
  },
  gridWrap: {
    width: "100%",
    gap: 12,
  },
  skelCard: {
    height: 220,
    borderRadius: 12,
    backgroundColor: "#E8ECF0",
  },
  errorText: {
    textAlign: "center",
    color: AppColors.heading,
    fontFamily: "PoppinsRegular",
  },
  adminToggleWrap: {
    paddingHorizontal: PAGE_GUTTER,
    paddingBottom: 8,
    backgroundColor: AppColors.sectionBg,
  },
  adminToggleText: {
    color: AppColors.accent,
    fontSize: 14,
    fontFamily: "PoppinsSemiBold",
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyWrap: {
    paddingVertical: 24,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
  },
  emptyCardTablet: { padding: 28 },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyIconWrapTablet: { width: 64, height: 64, borderRadius: 32 },
  emptyTitle: {
    fontFamily: "PoppinsBold",
    fontSize: 16,
    color: "#0F2137",
    textAlign: "center",
  },
  emptyTitleTablet: { fontSize: 18 },
  emptySubtitle: {
    marginTop: 8,
    fontFamily: "PoppinsRegular",
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  emptySubtitleTablet: { fontSize: 14 },
  emptyAction: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: AppColors.accent,
  },
  emptyActionTablet: { paddingVertical: 12 },
  emptyActionText: {
    color: "#FFFFFF",
    fontFamily: "PoppinsSemiBold",
    fontSize: 13,
  },
  emptyActionTextTablet: { fontSize: 14 },
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
});

