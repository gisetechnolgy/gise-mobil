import { useFocusEffect, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import CategoryChips from "../components/CategoryChips";
import FeaturedVenuesSection from "../components/FeaturedVenuesSection";
import HeroSection from "../components/HeroSection";
import HomeSections from "../components/HomeSections";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import { useDrawer } from "../context/DrawerContext";
import { useNotificationsPanel } from "../context/NotificationContext";
import { appRefreshControl } from "../../lib/appRefreshControl";
import { syncPushTokenWithBackend } from "../../lib/push-notifications";
import type { SectionReloadHandle } from "../../lib/sectionReload";

export default function HomeScreen() {
  const router = useRouter();
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
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [featuredVenuesLoading, setFeaturedVenuesLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const splashHiddenRef = useRef(false);
  const categoryChipsRef = useRef<SectionReloadHandle>(null);
  const featuredVenuesRef = useRef<SectionReloadHandle>(null);
  const homeSectionsRef = useRef<SectionReloadHandle>(null);

  useEffect(() => {
    if (splashHiddenRef.current) return;
    if (
      brandingLoading ||
      categoryLoading ||
      featuredVenuesLoading ||
      sectionsLoading
    ) {
      return;
    }
    splashHiddenRef.current = true;
    void SplashScreen.hideAsync().catch(() => {
      /* Splash zaten gizli olabilir */
    });
  }, [
    brandingLoading,
    categoryLoading,
    featuredVenuesLoading,
    sectionsLoading,
  ]);

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
        categoryChipsRef.current?.reload({ refresh: true }),
        featuredVenuesRef.current?.reload({ refresh: true }),
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
    <View className="flex-1 bg-app-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        scrollEnabled={!isOpen && !notifOpen}
        refreshControl={appRefreshControl(refreshing, onRefresh)}
      >
        <HeroSection
          onMenuPress={openDrawer}
          onNotificationPress={openNotifications}
          notificationUnreadCount={unreadCount}
          onProfilePress={() => router.push("/(tabs)/profile")}
        />

        <View className="bg-app-bg rounded-tl-[28px] rounded-tr-[28px] pt-2 -mt-7">
          <CategoryChips
            ref={categoryChipsRef}
            onLoadingChange={setCategoryLoading}
          />
          <FeaturedVenuesSection
            ref={featuredVenuesRef}
            onLoadingChange={setFeaturedVenuesLoading}
          />
          <HomeSections
            ref={homeSectionsRef}
            onLoadingChange={setSectionsLoading}
          />
        </View>
      </ScrollView>
    </View>
  );
}
