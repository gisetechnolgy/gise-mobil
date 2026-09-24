import { useFocusEffect, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import FeaturedEventsHero from "../components/FeaturedEventsHero";
import HomeSections from "../components/HomeSections";
import MobileHomeHeader from "../components/MobileHomeHeader";
import MobileSearchSheet from "../components/MobileSearchSheet";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import { useDrawer } from "../context/DrawerContext";
import { useNotificationsPanel } from "../context/NotificationContext";
import { appRefreshControl } from "../../lib/appRefreshControl";
import { syncPushTokenWithBackend } from "../../lib/push-notifications";
import type { SectionReloadHandle } from "../../lib/sectionReload";
import { buildEventsSearchHref, useTabGroup } from "../../lib/navigation";
import { AppColors } from "../../constants/colors";

export default function HomeScreen() {
  const router = useRouter();
  const tabGroup = useTabGroup();
  const { isOpen, openDrawer } = useDrawer();
  const {
    isOpen: notifOpen,
    openNotifications,
    unreadCount,
    refreshUnreadCount,
    refreshNotifications,
  } = useNotificationsPanel();
  const { user, refreshUser, isAuthenticated } = useAuth();
  const { refresh: refreshBranding, loading: brandingLoading } = useBranding();
  const [refreshing, setRefreshing] = useState(false);
  const [heroLoading, setHeroLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [headerHeight, setHeaderHeight] = useState(0);
  const splashHiddenRef = useRef(false);
  const heroRef = useRef<SectionReloadHandle>(null);
  const homeSectionsRef = useRef<SectionReloadHandle>(null);

  const onSearchSubmit = useCallback(
    (query: string) => {
      router.push(buildEventsSearchHref(tabGroup, query) as import("expo-router").Href);
    },
    [router, tabGroup],
  );

  useEffect(() => {
    if (splashHiddenRef.current) return;
    if (brandingLoading || heroLoading || sectionsLoading) {
      return;
    }
    splashHiddenRef.current = true;
    void SplashScreen.hideAsync().catch(() => {
      /* Splash zaten gizli olabilir */
    });
  }, [brandingLoading, heroLoading, sectionsLoading]);

  useFocusEffect(
    useCallback(() => {
      if (user?.isSaleMode) {
        router.replace("/(admin-tabs)/events" as import("expo-router").Href);
      }
    }, [user?.isSaleMode, router]),
  );

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        void syncPushTokenWithBackend();
        void refreshUnreadCount();
        void refreshUser();
      }
    }, [isAuthenticated, refreshUnreadCount, refreshUser]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshBranding(),
        isAuthenticated ? refreshUnreadCount() : Promise.resolve(),
        isAuthenticated ? refreshNotifications() : Promise.resolve(),
        isAuthenticated ? refreshUser() : Promise.resolve(),
        isAuthenticated ? syncPushTokenWithBackend() : Promise.resolve(),
        heroRef.current?.reload({ refresh: true }),
        homeSectionsRef.current?.reload({ refresh: true }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    refreshBranding,
    refreshUnreadCount,
    refreshNotifications,
    refreshUser,
    isAuthenticated,
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: AppColors.sectionBg }}>
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        scrollEnabled={!isOpen && !notifOpen && !searchOpen}
        refreshControl={appRefreshControl(refreshing, onRefresh)}
      >
        <FeaturedEventsHero
          ref={heroRef}
          onLoadingChange={setHeroLoading}
        />
        <HomeSections
          ref={homeSectionsRef}
          onLoadingChange={setSectionsLoading}
        />
      </ScrollView>
      <MobileSearchSheet
        visible={searchOpen}
        topOffset={headerHeight}
        query={searchQuery}
        scope="all"
      />
    </View>
  );
}
