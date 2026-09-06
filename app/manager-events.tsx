import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  EventCardImage,
  prefetchEventImages,
} from "./components/EventCardImage";
import LoginPrompt from "./components/LoginPrompt";
import { useAuth } from "./context/AuthContext";
import { useTranslation } from "./context/LocaleContext";
import { AppColors } from "../constants/colors";
import { appRefreshControl } from "../lib/appRefreshControl";
import {
  EventItem,
  eventImageCacheKey,
  fetchUpcomingEvents,
  formatEventDate,
} from "../lib/events";
import { useIsTablet } from "../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";

export default function ManagerEventsScreen() {
  const router = useRouter();
  const isTablet = useIsTablet();
  const { t } = useTranslation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canAccess = !!user && user.isManager && user.isManagerSaleModeActive;

  const load = useCallback(async () => {
    if (!user || !canAccess) return;
    setLoading(true);
    try {
      const filters =
        user.isOrganisationCompanyManager && user.rid
          ? { organisationCompanyId: user.rid, perPage: 80 }
          : user.isVenueManager && user.rid
            ? { venueId: user.rid, perPage: 80 }
            : { perPage: 80 };
      const res = await fetchUpcomingEvents(filters);
      setEvents(res.items);
      void prefetchEventImages(res.items);
    } finally {
      setLoading(false);
    }
  }, [user, canAccess]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !canAccess) {
      router.replace("/(tabs)");
    }
  }, [isLoading, isAuthenticated, canAccess, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={AppColors.accent} />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPrompt title={t('managerLoginPrompt')} icon="briefcase-outline" />;
  }

  if (!canAccess) {
    return null;
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={styles.title}>Satış Etkinlikleri</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={AppColors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            isTablet && styles.listTablet,
          ]}
          refreshControl={appRefreshControl(refreshing, async () => {
            setRefreshing(true);
            try {
              await load();
            } finally {
              setRefreshing(false);
            }
          })}
        >
          {events.length === 0 ? (
            <Text style={styles.empty}>Yaklaşan etkinlik bulunamadı.</Text>
          ) : (
            events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.card, isTablet && styles.cardTablet]}
                activeOpacity={0.85}
                onPress={() => router.push(`/events/${event.id}`)}
              >
                <EventCardImage
                  imageUrl={event.imageUrl}
                  cacheKey={eventImageCacheKey(event)}
                  recyclingKey={event.id}
                  className="rounded-xl"
                  style={{
                    width: isTablet ? 120 : 96,
                    height: isTablet ? 120 : 96,
                  }}
                />
                <View style={styles.cardBody}>
                  <Text style={styles.eventTitle} numberOfLines={1} ellipsizeMode="tail">
                    {event.title}
                  </Text>
                  <Text style={styles.eventDate}>
                    {formatEventDate(event.startsAt)}
                  </Text>
                  <Text style={styles.saleCta}>Bilet Sat</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  backBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  title: { color: AppColors.cardText, fontSize: 20, fontFamily: "PoppinsSemiBold" },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  listTablet: { padding: 22, gap: 16 },
  card: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  cardTablet: { borderRadius: 16, padding: 14, gap: 14 },
  cardBody: { flex: 1, minWidth: 0 },
  eventTitle: {
    color: AppColors.cardText,
    fontSize: 16,
    fontFamily: "PoppinsBold",
  },
  eventDate: { color: "#5f6f7d", fontSize: 13, marginTop: 4 },
  saleCta: {
    color: AppColors.navBg,
    fontSize: 14,
    fontFamily: "PoppinsBold",
    marginTop: 8,
  },
  empty: { color: "rgba(25,58,88,0.75)", textAlign: "center" },
});
