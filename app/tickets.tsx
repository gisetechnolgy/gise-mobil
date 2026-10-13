import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { appRefreshControl } from "../lib/appRefreshControl";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColors } from "../constants/colors";
import { useAuth } from "./context/AuthContext";
import { useTranslation } from "./context/_LocaleContext";
import { useIsTablet } from "../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";
import { AppTextInput } from "@/components/ui/AppTextInput";
import { TicketQrCode } from "../components/TicketQrCode";
import { LIST_CARD } from "../constants/homeSectionList";
import { EventCardImage } from "./components/_EventCardImage";
import {
  fetchMyTickets,
  formatTicketDateLong,
  formatTicketTime,
  canRequestTicketRefund,
  isTicketRefundDone,
  isTicketRefundPending,
  markTicketsRefundDoneForProducts,
  markTicketsRefundPendingForProducts,
  updateTicketHolderName,
  TicketItem,
} from "../lib/tickets";
import CustomerRefundModal from "./components/CustomerRefundModal";

const PAGE_SIZE = 10;

const FOOTER_LINE_HEIGHT = Math.round(
  Math.max(LIST_CARD.priceSize, LIST_CARD.buySize) * 1.3,
);

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
  const [refundSaleId, setRefundSaleId] = useState<string | null>(null);
  const [editingHolder, setEditingHolder] = useState(false);
  const [holderDraft, setHolderDraft] = useState("");
  const [holderSaving, setHolderSaving] = useState(false);
  const [holderError, setHolderError] = useState<string | null>(null);
  const sheetSlideAnim = useRef(new Animated.Value(0)).current;
  const keyboardLift = useRef(new Animated.Value(0)).current;

  const openTicketSheet = useCallback(
    (item: TicketItem) => {
      sheetSlideAnim.setValue(windowHeight);
      keyboardLift.setValue(0);
      setEditingHolder(false);
      setHolderError(null);
      setSelectedTicket(item);
    },
    [keyboardLift, sheetSlideAnim, windowHeight],
  );

  const closeTicketSheet = useCallback(() => {
    Keyboard.dismiss();
    keyboardLift.setValue(0);
    setEditingHolder(false);
    setHolderError(null);
    setSelectedTicket(null);
  }, [keyboardLift]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardLift, {
        toValue: e.endCoordinates.height,
        duration:
          Platform.OS === "ios" ? Math.max(e.duration ?? 250, 200) : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
    const onHide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardLift, {
        toValue: 0,
        duration:
          Platform.OS === "ios" ? Math.max(e.duration ?? 250, 200) : 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [keyboardLift]);

  const askEditHolderName = useCallback(() => {
    if (!selectedTicket) return;
    if (selectedTicket.isUsed || isTicketRefundDone(selectedTicket)) {
      Alert.alert("", t("ticketHolderNameUsedBlocked"));
      return;
    }
    Alert.alert(t("editTicketHolderName"), t("ticketHolderNamePermanentWarn"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("continueAction"),
        onPress: () => {
          // Alert kapanınca sheet içinde inline input (2. Modal iOS'ta açılmıyor)
          setHolderDraft(
            selectedTicket.holderName === "—"
              ? ""
              : selectedTicket.holderName,
          );
          setHolderError(null);
          setTimeout(() => setEditingHolder(true), 50);
        },
      },
    ]);
  }, [selectedTicket, t]);

  const saveHolderName = useCallback(async () => {
    if (!selectedTicket || holderSaving) return;
    const next = holderDraft.trim().replace(/\s+/g, " ");
    if (next.length < 2) {
      setHolderError(t("ticketHolderNameInvalid"));
      return;
    }
    setHolderSaving(true);
    setHolderError(null);
    try {
      const updated = await updateTicketHolderName(selectedTicket.id, next);
      const merged: TicketItem = {
        ...selectedTicket,
        ...updated,
        eventImageUrl: selectedTicket.eventImageUrl ?? updated.eventImageUrl,
        holderName: updated.holderName || next,
      };
      setSelectedTicket(merged);
      setItems((prev) =>
        prev.map((it) => (it.id === merged.id ? { ...it, ...merged } : it)),
      );
      Keyboard.dismiss();
      setEditingHolder(false);
    } catch {
      setHolderError(t("ticketHolderNameFailed"));
    } finally {
      setHolderSaving(false);
    }
  }, [holderDraft, holderSaving, selectedTicket, t]);

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
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
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
          renderItem={({ item }) => {
            const iso = item.eventDate || item.createdAt;
            const time = formatTicketTime(iso);
            const dateTime = [formatTicketDateLong(iso), time]
              .filter(Boolean)
              .join(", ");
            const refundDone = isTicketRefundDone(item);
            const refundPending = !refundDone && isTicketRefundPending(item);
            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => openTicketSheet(item)}
                style={[
                  styles.ticketCard,
                  { height: LIST_CARD.height, borderRadius: LIST_CARD.radius },
                ]}
              >
                <View
                  style={[
                    styles.ticketThumb,
                    {
                      width: LIST_CARD.imageWidth,
                      borderTopLeftRadius: LIST_CARD.radius,
                      borderBottomLeftRadius: LIST_CARD.radius,
                    },
                  ]}
                >
                  <EventCardImage
                    imageUrl={item.eventImageUrl ?? null}
                    cacheKey={item.eventImageUrl ?? item.eventId ?? item.id}
                    recyclingKey={`t-${item.id}`}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                </View>
                <View
                  style={[
                    styles.ticketContent,
                    {
                      paddingHorizontal: LIST_CARD.textPad,
                      paddingVertical: LIST_CARD.textPadY,
                      gap: LIST_CARD.lineGap,
                    },
                  ]}
                >
                  <Text
                    style={[styles.ticketTitle, { fontSize: LIST_CARD.titleSize }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.eventTitle}
                  </Text>
                  {dateTime ? (
                    <Text
                      style={[styles.ticketMeta, { fontSize: LIST_CARD.metaSize }]}
                      numberOfLines={1}
                    >
                      {dateTime}
                    </Text>
                  ) : null}
                  {item.venueName ? (
                    <Text
                      style={[styles.ticketMeta, { fontSize: LIST_CARD.metaSize }]}
                      numberOfLines={1}
                    >
                      {item.venueName}
                    </Text>
                  ) : null}
                  <View style={styles.ticketFooter}>
                    <View style={styles.ticketLabelLine}>
                      <View style={styles.ticketPill}>
                        <Text
                          style={[
                            styles.ticketPillText,
                            {
                              fontSize: LIST_CARD.priceSize,
                              lineHeight: FOOTER_LINE_HEIGHT,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {item.holderName}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.ticketAction,
                        refundDone && styles.ticketActionDone,
                        {
                          fontSize: LIST_CARD.buySize,
                          lineHeight: FOOTER_LINE_HEIGHT,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {refundDone
                        ? t("refundStatusDone")
                        : refundPending
                          ? t("refundStatusPendingShort")
                          : t("viewTicket")}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
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
          <Pressable
            style={styles.modalOverlay}
            onPress={closeTicketSheet}
            accessibilityRole="button"
          />
          <Animated.View
            pointerEvents="auto"
            collapsable={false}
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom, 16) + 24,
                transform: [
                  {
                    translateY: Animated.subtract(
                      sheetSlideAnim,
                      keyboardLift,
                    ),
                  },
                ],
              },
            ]}
          >
            {selectedTicket && (
              <>
                {isTicketRefundDone(selectedTicket) ? (
                  <Text style={styles.refundCornerStatus}>
                    {t("refundStatusDone")}
                  </Text>
                ) : isTicketRefundPending(selectedTicket) ? (
                  <Text
                    style={[styles.refundCornerStatus, styles.refundCornerPending]}
                    numberOfLines={2}
                  >
                    {t("refundStatusPendingShort")}
                  </Text>
                ) : canRequestTicketRefund(selectedTicket) ? (
                  <TouchableOpacity
                    style={styles.refundCornerBtn}
                    activeOpacity={0.75}
                    hitSlop={8}
                    onPress={() => {
                      const saleId = selectedTicket.saleId;
                      closeTicketSheet();
                      setRefundSaleId(saleId);
                    }}
                  >
                    <Text style={styles.refundCornerBtnText}>
                      {t("refundRequest")}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <TicketQrCode
                  value={selectedTicket.qrData}
                  size={220}
                  style={styles.qr}
                />
                <Text style={styles.sheetEventTitle}>
                  {selectedTicket.eventTitle}
                </Text>
                <View style={styles.sheetDivider} />
                {editingHolder ? (
                  <View style={styles.holderEditInline}>
                    <AppTextInput
                      value={holderDraft}
                      onChangeText={(v) => {
                        setHolderDraft(v);
                        if (holderError) setHolderError(null);
                      }}
                      placeholder={t("ticketHolderNamePlaceholder")}
                      placeholderTextColor="#A0A8B0"
                      autoCapitalize="words"
                      autoCorrect={false}
                      autoFocus
                      editable={!holderSaving}
                      style={styles.editInput}
                      maxLength={80}
                    />
                    {holderError ? (
                      <Text style={styles.editError}>{holderError}</Text>
                    ) : null}
                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={styles.editSecondaryBtn}
                        disabled={holderSaving}
                        onPress={() => {
                          Keyboard.dismiss();
                          setEditingHolder(false);
                          setHolderError(null);
                        }}
                      >
                        <Text style={styles.editSecondaryText}>{t("cancel")}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.editPrimaryBtn,
                          holderSaving && { opacity: 0.7 },
                        ]}
                        disabled={holderSaving}
                        onPress={() => void saveHolderName()}
                      >
                        {holderSaving ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.editPrimaryText}>
                            {t("ticketHolderNameSave")}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.holderRow}>
                    <Text style={styles.sheetHolder} numberOfLines={2}>
                      {selectedTicket.holderName}
                    </Text>
                    {!selectedTicket.isUsed &&
                    !isTicketRefundDone(selectedTicket) ? (
                      <TouchableOpacity
                        onPress={askEditHolderName}
                        hitSlop={10}
                        style={styles.holderEditBtn}
                        accessibilityLabel={t("editTicketHolderName")}
                      >
                        <Ionicons
                          name="create-outline"
                          size={20}
                          color={AppColors.accent}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
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

      <CustomerRefundModal
        visible={!!refundSaleId}
        saleId={refundSaleId}
        onClose={() => {
          setRefundSaleId(null);
          void loadInitial({ silent: true });
        }}
        onSuccess={(result, refundedItems) => {
          if (!refundSaleId) return;
          const saleId = refundSaleId;
          const productIds = refundedItems.map((i) => i.productId);
          const countsByProduct: Record<string, number> = {};
          for (const item of refundedItems) {
            countsByProduct[item.productId] =
              (countsByProduct[item.productId] ?? 0) + item.count;
          }
          const done = result?.status === "done";
          const patch = done
            ? markTicketsRefundDoneForProducts
            : markTicketsRefundPendingForProducts;
          setItems((prev) =>
            patch(prev, saleId, productIds, countsByProduct),
          );
          setSelectedTicket((prev) =>
            prev && prev.saleId === saleId
              ? patch([prev], saleId, productIds, countsByProduct)[0] ?? prev
              : prev,
          );
        }}
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
    paddingBottom: 120,
    gap: 12,
  },
  listContentTablet: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 140,
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
  ticketCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ticketThumb: {
    height: "100%",
    backgroundColor: "#E5E7EB",
    flexShrink: 0,
    overflow: "hidden",
  },
  ticketContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: "flex-start",
  },
  ticketTitle: {
    fontFamily: "PoppinsBold",
    color: AppColors.heading,
    lineHeight: 16,
  },
  ticketMeta: {
    fontFamily: "PoppinsRegular",
    color: "#808080",
  },
  ticketFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: "auto",
  },
  ticketLabelLine: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    alignItems: "flex-start",
  },
  ticketPill: {
    maxWidth: "100%",
    backgroundColor: "#e6e6e6",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  ticketPillText: {
    fontFamily: "PoppinsBold",
    color: AppColors.heading,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  ticketAction: {
    flexShrink: 0,
    paddingVertical: 5,
    fontFamily: "PoppinsBold",
    color: AppColors.accent,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  ticketActionDone: {
    color: AppColors.accent,
  },
  refundCornerBtn: {
    position: "absolute",
    top: 14,
    right: 16,
    zIndex: 5,
  },
  refundCornerBtnText: {
    color: AppColors.accent,
    fontFamily: "PoppinsSemiBold",
    fontSize: 12,
  },
  refundCornerStatus: {
    position: "absolute",
    top: 14,
    right: 16,
    zIndex: 5,
    maxWidth: 120,
    color: AppColors.accent,
    fontFamily: "PoppinsMedium",
    fontSize: 11,
    textAlign: "right",
  },
  refundCornerPending: {
    maxWidth: 130,
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
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    minHeight: 520,
    alignItems: "center",
    zIndex: 2,
    elevation: 24,
  },
  qr: {
    width: 220,
    height: 220,
    marginBottom: 16,
  },
  sheetEventTitle: {
    color: "#111827",
    fontSize: 28,
    fontFamily: "PoppinsBold",
    textAlign: "center",
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  sheetDivider: {
    width: "100%",
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    marginBottom: 16,
  },
  holderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 28,
    maxWidth: "100%",
  },
  sheetHolder: {
    color: "#111827",
    fontSize: 22,
    fontFamily: "PoppinsBold",
    textAlign: "center",
    flexShrink: 1,
  },
  holderEditBtn: {
    padding: 4,
    flexShrink: 0,
  },
  holderEditInline: {
    width: "100%",
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  sheetLabel: {
    color: "#111827",
    fontSize: 18,
    fontFamily: "PoppinsBold",
    marginTop: 4,
    marginBottom: 18,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: "PoppinsRegular",
    fontSize: 16,
    color: AppColors.heading,
    letterSpacing: 0,
    width: "100%",
    textAlign: "center",
  },
  editError: {
    marginTop: 8,
    fontFamily: "PoppinsRegular",
    fontSize: 13,
    color: "#DC2626",
    textAlign: "center",
  },
  editActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  editSecondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  editSecondaryText: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 14,
    color: AppColors.heading,
  },
  editPrimaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: AppColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  editPrimaryText: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 14,
    color: "#fff",
  },
  metaGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 18,
    marginTop: 4,
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
