import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { appRefreshControl } from "../lib/appRefreshControl";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColors } from "../constants/colors";
import { useAuth } from "./context/AuthContext";
import { useTranslation } from "./context/LocaleContext";
import { useIsTablet } from "../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";
import {
  fetchMyTickets,
  formatTicketDate,
  formatTicketDateLong,
  formatTicketTime,
  TicketItem,
} from "../lib/tickets";

const PAGE_SIZE = 10;

export default function TicketsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { user } = useAuth();
  const { height: windowHeight } = useWindowDimensions();
  const [items, setItems] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const sheetSlideAnim = useRef(new Animated.Value(0)).current;

  const openTicketSheet = useCallback(
    (item: TicketItem) => {
      sheetSlideAnim.setValue(windowHeight);
      setSelectedTicket(item);
    },
    [sheetSlideAnim, windowHeight],
  );

  const closeTicketSheet = useCallback(() => {
    setSelectedTicket(null);
  }, []);

  const loadInitial = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user?.id) return;
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetchMyTickets({
          userId: user.id,
          limit: PAGE_SIZE,
          page: 1,
        });
        setItems(res.items);
        setPage(res.page);
        setHasMore(res.hasMore);
      } catch {
        setError(t("ticketsLoadError"));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user?.id],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadInitial({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore || !user?.id) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetchMyTickets({
        userId: user.id,
        limit: PAGE_SIZE,
        page: nextPage,
      });
      setItems((prev) => [...prev, ...res.items]);
      setPage(res.page);
      setHasMore(res.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, loading, hasMore, user?.id, page]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!selectedTicket) {
      sheetSlideAnim.setValue(windowHeight);
      return;
    }

    sheetSlideAnim.setValue(windowHeight);
    Animated.timing(sheetSlideAnim, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [selectedTicket, sheetSlideAnim, windowHeight]);

  const refreshCtrl = appRefreshControl(refreshing, onRefresh);

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <View
        style={[
          styles.header,
          isTablet && styles.headerTablet,
          { paddingTop: insets.top + 2 },
        ]}
      >
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
        <Text
          style={[styles.headerTitle, isTablet && styles.headerTitleTablet]}
        >
          {t("tickets")}
        </Text>
        <View style={[styles.backBtn, isTablet && styles.backBtnTablet]} />
      </View>

      {loading ? (
        <FlatList
          data={Array.from({ length: 6 }).map((_, i) => ({
            id: `skeleton-${i}`,
          }))}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            isTablet && styles.listContentTablet,
          ]}
          renderItem={() => (
            <View style={[styles.card, isTablet && styles.cardTablet]}>
              <View
                style={[styles.skeletonLine, { width: "82%", height: 20 }]}
              />
              <View
                style={[styles.skeletonLine, { width: "42%", marginTop: 8 }]}
              />
              <View
                style={[styles.skeletonLine, { width: "36%", marginTop: 8 }]}
              />
              <View
                style={[styles.skeletonLine, { width: "34%", marginTop: 8 }]}
              />
              <View
                style={[styles.skeletonLine, { width: "26%", marginTop: 8 }]}
              />
            </View>
          )}
          refreshControl={refreshCtrl}
        />
      ) : error ? (
        <ScrollView
          contentContainerStyle={[styles.center, { flexGrow: 1 }]}
          refreshControl={refreshCtrl}
        >
          <Text style={styles.errorText}>{error}</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            isTablet && styles.listContentTablet,
            items.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={refreshCtrl}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            void loadMore();
          }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, isTablet && styles.cardTablet]}
              activeOpacity={0.85}
              onPress={() => openTicketSheet(item)}
            >
              <View style={styles.cardTop}>
                <Text
                  style={[
                    styles.eventTitle,
                    isTablet && styles.eventTitleTablet,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.eventTitle}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color={AppColors.cardText}
                  style={styles.chevron}
                />
              </View>
              <Text style={[styles.subtle, isTablet && styles.subtleTablet]}>
                #{item.ticketNo}
              </Text>
              <Text style={[styles.subtle, isTablet && styles.subtleTablet]}>
                {item.holderName}
              </Text>
              <Text style={[styles.subtle, isTablet && styles.subtleTablet]}>
                {item.ticketLabel}
              </Text>
              <Text style={[styles.dateText, isTablet && styles.subtleTablet]}>
                {formatTicketDate(item.eventDate || item.createdAt)}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyCard, isTablet && styles.emptyCardTablet]}>
                <View style={[styles.emptyIconWrap, isTablet && styles.emptyIconWrapTablet]}>
                  <Ionicons
                    name="ticket-outline"
                    size={isTablet ? 34 : 30}
                    color={AppColors.cardText}
                  />
                </View>
                <Text style={[styles.emptyTitle, isTablet && styles.emptyTitleTablet]}>
                  {t("noTicketsTitle")}
                </Text>
                <Text style={[styles.emptySubtitle, isTablet && styles.emptySubtitleTablet]}>
                  {t("noTicketsSubtitle")}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.emptyAction, isTablet && styles.emptyActionTablet]}
                  onPress={() => router.push("/(tabs)/events" as import("expo-router").Href)}
                >
                  <Text style={[styles.emptyActionText, isTablet && styles.emptyActionTextTablet]}>
                    {t("exploreEvents")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <View style={[styles.card, isTablet && styles.cardTablet]}>
                  <View
                    style={[styles.skeletonLine, { width: "78%", height: 20 }]}
                  />
                  <View
                    style={[
                      styles.skeletonLine,
                      { width: "38%", marginTop: 8 },
                    ]}
                  />
                  <View
                    style={[
                      styles.skeletonLine,
                      { width: "30%", marginTop: 8 },
                    ]}
                  />
                  <View
                    style={[
                      styles.skeletonLine,
                      { width: "32%", marginTop: 8 },
                    ]}
                  />
                  <View
                    style={[
                      styles.skeletonLine,
                      { width: "22%", marginTop: 8 },
                    ]}
                  />
                </View>
              </View>
            ) : null
          }
        />
      )}

      <Modal
        animationType="fade"
        transparent
        visible={!!selectedTicket}
        onRequestClose={closeTicketSheet}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalOverlay} onPress={closeTicketSheet} />
          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: sheetSlideAnim }] },
            ]}
          >
            {selectedTicket && (
              <>
                <Image
                  source={{
                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                      selectedTicket.qrData,
                    )}`,
                  }}
                  style={styles.qr}
                />
                <Text style={styles.sheetEventTitle}>
                  {selectedTicket.eventTitle}
                </Text>
                <View style={styles.sheetDivider} />
                <Text style={styles.sheetHolder}>
                  {selectedTicket.holderName}
                </Text>
                <Text style={styles.sheetLabel}>
                  {selectedTicket.ticketLabel}
                </Text>

                <View style={styles.metaGrid}>
                  <View style={styles.metaCell}>
                    <Ionicons
                      name="ticket-outline"
                      size={16}
                      color={AppColors.cardText}
                    />
                    <Text style={styles.metaText}>
                      {selectedTicket.ticketNo}
                    </Text>
                  </View>
                  <View style={styles.metaCell}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={AppColors.cardText}
                    />
                    <Text style={styles.metaText}>
                      {selectedTicket.venueName || t("venueLabel")}
                    </Text>
                  </View>
                  <View style={styles.metaCell}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={AppColors.cardText}
                    />
                    <Text style={styles.metaText}>
                      {formatTicketDateLong(
                        selectedTicket.eventDate || selectedTicket.createdAt,
                      )}
                    </Text>
                  </View>
                  <View style={styles.metaCell}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={AppColors.cardText}
                    />
                    <Text style={styles.metaText}>
                      {formatTicketTime(
                        selectedTicket.eventDate || selectedTicket.createdAt,
                      )}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
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
  headerTitle: {
    color: "#000000",
    fontSize: 18,
    fontFamily: "PoppinsSemiBold",
  },
  headerTitleTablet: {
    fontSize: 24,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  listContentTablet: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    padding: 12,
  },
  cardTablet: {
    borderRadius: 16,
    padding: 16,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  eventTitle: {
    flex: 1,
    color: AppColors.cardText,
    fontSize: 16,
    fontFamily: "PoppinsBold",
    lineHeight: 21,
    paddingRight: 10,
  },
  eventTitleTablet: {
    fontSize: 20,
    lineHeight: 28,
  },
  chevron: {
    marginTop: 1,
  },
  subtle: {
    marginTop: 2,
    color: "#5f6f7d",
    fontSize: 14,
  },
  subtleTablet: {
    fontSize: 17,
  },
  dateText: {
    marginTop: 2,
    color: "#546573",
    fontSize: 14,
    fontFamily: "PoppinsMedium",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
    paddingTop: 8,
    paddingBottom: 20,
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
  errorText: {
    color: "#b91c1c",
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: 8,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 6,
    backgroundColor: "#E8ECF0",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 28,
    alignItems: "center",
    zIndex: 1,
  },
  qr: {
    width: 160,
    height: 160,
    marginBottom: 12,
  },
  sheetEventTitle: {
    color: "#111827",
    fontSize: 31,
    fontFamily: "PoppinsBold",
    textAlign: "center",
    marginBottom: 12,
  },
  sheetDivider: {
    width: "100%",
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    marginBottom: 14,
  },
  sheetHolder: {
    color: "#111827",
    fontSize: 22,
    fontFamily: "PoppinsBold",
  },
  sheetLabel: {
    color: "#111827",
    fontSize: 18,
    fontFamily: "PoppinsBold",
    marginTop: 4,
    marginBottom: 14,
  },
  metaGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 14,
  },
  metaCell: {
    width: "50%",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  metaText: {
    color: "#1F2937",
    fontSize: 13,
    textAlign: "center",
  },
});
