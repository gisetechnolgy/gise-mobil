import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppColors } from "../constants/colors";
import { LIST_CARD } from "../constants/mobileDetail";
import { appRefreshControl } from "../lib/appRefreshControl";
import { fetchEventById, type EventItem } from "../lib/events";
import { readFavouriteEventIds } from "../lib/favouriteEvents";
import {
  enrichEventsWithPriceInfo,
  type ActivePriceInfo,
} from "../lib/startingPrice";
import { useIsTablet } from "../lib/responsive";
import HomeEventHorizontalCard from "./components/detail/HomeEventHorizontalCard";
import { useAuth } from "./context/AuthContext";
import { useTranslation } from "./context/_LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";

type PricedEvent = EventItem & { priceInfo?: ActivePriceInfo | null };

export default function FavouriteEventsScreen() {
  const router = useRouter();
  const isTablet = useIsTablet();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [events, setEvents] = useState<PricedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setEvents([]);
      setLoading(false);
      return;
    }
    try {
      const ids = await readFavouriteEventIds(user.id);
      const results = await Promise.all(
        ids.map((id) =>
          fetchEventById(id, { forListing: true }).catch(() => null),
        ),
      );
      const found = results.filter((e): e is EventItem => Boolean(e));
      setEvents(await enrichEventsWithPriceInfo(found));
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={isTablet ? 26 : 22} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, isTablet && styles.pageTitleTablet]}>
          {t("favouriteEvents")}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: isTablet ? 26 : 20, gap: LIST_CARD.gap },
        ]}
        refreshControl={appRefreshControl(refreshing, onRefresh)}
      >
        {loading ? (
          <ActivityIndicator color={AppColors.accent} style={{ marginTop: 24 }} />
        ) : events.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="heart-outline" size={30} color={AppColors.cardText} />
            <Text style={styles.emptyTitle}>{t("noFavouriteEvents")}</Text>
            <Text style={styles.emptySubtitle}>{t("noFavouriteEventsHint")}</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.emptyAction}
              onPress={() => router.push("/(tabs)/events" as import("expo-router").Href)}
            >
              <Text style={styles.emptyActionText}>{t("discoverEvents")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          events.map((event) => (
            <HomeEventHorizontalCard key={event.id} event={event} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  pageTitle: { color: "#000000", fontSize: 20, fontFamily: "PoppinsSemiBold" },
  pageTitleTablet: { fontSize: 26 },
  content: { paddingTop: 10, paddingBottom: 120, flexGrow: 1 },
  emptyCard: {
    width: "100%",
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 14,
    color: AppColors.heading,
    fontSize: 16,
    fontFamily: "PoppinsBold",
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 8,
    color: "rgba(52, 61, 72, 0.65)",
    fontSize: 13,
    fontFamily: "PoppinsMedium",
    textAlign: "center",
    lineHeight: 18,
  },
  emptyAction: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: AppColors.accent,
  },
  emptyActionText: { color: AppColors.navText, fontSize: 14, fontFamily: "PoppinsBold" },
});
