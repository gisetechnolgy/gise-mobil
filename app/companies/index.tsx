import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import EntityListCard from "../components/detail/EntityListCard";
import MobileHomeHeader from "../components/MobileHomeHeader";
import MobileSearchSheet from "../components/MobileSearchSheet";
import { AppColors } from "../../constants/colors";
import { PAGE_GUTTER, SECTION_BG } from "../../constants/homeSection";
import { ENTITY_LIST_CARD } from "../../constants/mobileDetail";
import { useDrawer } from "../context/DrawerContext";
import { useNotificationsPanel } from "../context/NotificationContext";
import { useTranslation } from "../context/_LocaleContext";
import { appRefreshControl } from "../../lib/appRefreshControl";
import { CITY_OPTIONS } from "../../lib/cities";
import { buildEventsSearchHref, useTabGroup } from "../../lib/navigation";
import { useIsTablet } from "../../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";
import {
  fetchCompaniesForListPage,
  companyImageCacheKey,
  type CompanyItem,
} from "../../lib/companies";

type PickerItem = { id: string; label: string };

function CityFilterField({
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

export default function CompaniesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const tabGroup = useTabGroup();
  const { openDrawer } = useDrawer();
  const { openNotifications, unreadCount } = useNotificationsPanel();
  const isTablet = useIsTablet();
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [cityFilter, setCityFilter] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [siteSearchOpen, setSiteSearchOpen] = useState(false);
  const [siteSearchQuery, setSiteSearchQuery] = useState("");
  const [headerHeight, setHeaderHeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCompanies = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchCompaniesForListPage();
      setCompanies(data);
    } catch {
      setError(t("companiesLoadError"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCompanies({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadCompanies]);

  const filteredCompanies = useMemo(() => {
    let list = companies;
    if (cityFilter) {
      list = list.filter((company) => company.city === cityFilter);
    }
    return [...list].sort((a, b) => {
      const countDiff = (b.eventCount || 0) - (a.eventCount || 0);
      if (countDiff !== 0) return countDiff;
      return String(a.name || "").localeCompare(String(b.name || ""), "tr", {
        sensitivity: "base",
      });
    });
  }, [companies, cityFilter]);

  const cityFilterLabel = cityFilter
    ? CITY_OPTIONS.find((c) => c.value === cityFilter)?.label ?? cityFilter
    : t("selectCity");

  const pickerItems = useMemo(
    (): PickerItem[] => [
      { id: "", label: t("all") },
      ...CITY_OPTIONS.map((c) => ({ id: c.value, label: c.label })),
    ],
    [t],
  );

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
  const hasActiveFilters = !!cityFilter;

  const pageChrome = (
    <>
      <View style={[styles.header, isTablet && styles.headerTablet]}>
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
        <Text style={[styles.pageTitle, isTablet && styles.pageTitleTablet]}>
          {t("organisers")}
        </Text>
        <View style={[styles.backBtn, isTablet && styles.backBtnTablet]} />
      </View>

      <View style={styles.toolbar}>
        <CityFilterField
          value={cityFilterLabel}
          onPress={() => setPickerOpen(true)}
        />
      </View>
    </>
  );

  return (
    <View style={[styles.safe, { backgroundColor: SECTION_BG }]}>
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
                key={`company-skeleton-${idx}`}
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
          <View
            style={[listPadStyle, { justifyContent: "center", flexGrow: 1 }]}
          >
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
            {filteredCompanies.length === 0 ? (
              <Text style={styles.emptyText}>
                {hasActiveFilters
                  ? t("noCompaniesFilter")
                  : t("noCompaniesEmpty")}
              </Text>
            ) : (
              filteredCompanies.map((company) => (
                <EntityListCard
                  key={company.id}
                  id={company.id}
                  name={company.name}
                  hrefBase="companies"
                  bannerUrl={company.bannerUrl}
                  logoUrl={company.logoUrl}
                  city={company.city}
                  cacheKey={companyImageCacheKey(company)}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={styles.sortOverlay}
          onPress={() => setPickerOpen(false)}
        >
          <Pressable style={styles.sortSheet} onPress={() => {}}>
            <ScrollView style={{ maxHeight: 360 }}>
              {pickerItems.map((item) => (
                <TouchableOpacity
                  key={item.id || "all"}
                  style={[
                    styles.sortOption,
                    cityFilter === item.id && styles.sortOptionActive,
                  ]}
                  onPress={() => {
                    setCityFilter(item.id);
                    setPickerOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      cityFilter === item.id && styles.sortOptionTextActive,
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
  filterCell: {
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
