import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColors } from "../../constants/colors";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/_LocaleContext";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { appRefreshControl } from "../../lib/appRefreshControl";
import { getAppLocale } from "../../lib/appLocale";
import { useIsTablet } from "../../lib/responsive";
import {
  fetchUserSalesPage,
  formatSaleMoney,
  formatSalePaymentType,
  type UserSaleItem,
} from "../../lib/userSales";
import { AppText as Text } from "@/components/ui/AppText";

const PAGE_SIZE = 10;

function formatSaleDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(getAppLocale() === "en" ? "en-GB" : "tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function statusLabel(
  status: number,
  t: (k: "saleStatusSuccess" | "saleStatusFailed" | "saleStatusPending") => string,
): { label: string; color: string } {
  if (status === 1) return { label: t("saleStatusSuccess"), color: "#16A34A" };
  if (status === 2) return { label: t("saleStatusFailed"), color: "#DC2626" };
  return { label: t("saleStatusPending"), color: "#D97706" };
}

export default function PaymentDetailsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { user } = useAuth();
  useRequireAuth("/account/payment-details");

  const [items, setItems] = useState<UserSaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserSaleItem | null>(null);

  const loadInitial = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user?.id) return;
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetchUserSalesPage({
          userId: user.id,
          page: 1,
          perPage: PAGE_SIZE,
        });
        setItems(res.items);
        setPage(res.page);
        setHasMore(res.hasMore);
      } catch {
        setError(t("paymentDetailsLoadError"));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [t, user?.id],
  );

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

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
      const res = await fetchUserSalesPage({
        userId: user.id,
        page: nextPage,
        perPage: PAGE_SIZE,
      });
      setItems((prev) => [...prev, ...res.items]);
      setPage(res.page);
      setHasMore(res.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, page, user?.id]);

  const refreshCtrl = appRefreshControl(refreshing, onRefresh);

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 2 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={AppColors.cardText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("paymentDetails")}</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={AppColors.accent} />
        </View>
      ) : error ? (
        <ScrollView
          contentContainerStyle={styles.emptyWrap}
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
            items.length === 0 && styles.emptyWrap,
          ]}
          refreshControl={refreshCtrl}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.35}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{t("noSales")}</Text>
              <Text style={styles.emptySubtitle}>{t("noSalesMessage")}</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={{ marginVertical: 16 }}
                color={AppColors.accent}
              />
            ) : items.length > 0 && !hasMore ? (
              <Text style={styles.footerHint}>{t("allTransactionsAreShown")}</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const st = statusLabel(item.status, (key) => t(key));
            return (
              <TouchableOpacity
                style={[styles.card, isTablet && styles.cardTablet]}
                activeOpacity={0.85}
                onPress={() => setSelected(item)}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.ref}>#{item.ref}</Text>
                  <Text style={[styles.status, { color: st.color }]}>
                    {st.label}
                  </Text>
                </View>
                <Text style={styles.eventName} numberOfLines={2}>
                  {item.eventName || t("eventLabel")}
                </Text>
                <Text style={styles.meta}>
                  {formatSaleDate(item.createdAt)} ·{" "}
                  {formatSalePaymentType(item.paymentType)}
                </Text>
                <Text style={styles.amount}>
                  {formatSaleMoney(item.paymentTotal)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t("saleDetails")}</Text>
            {selected ? (
              <ScrollView style={{ maxHeight: 420 }}>
                <Text style={styles.modalEvent}>{selected.eventName}</Text>
                {selected.sessionAt ? (
                  <Text style={styles.modalLine}>
                    {t("session")}: {formatSaleDate(selected.sessionAt)}
                  </Text>
                ) : null}
                <Text style={styles.modalLine}>
                  {t("salesTableRef")}: #{selected.ref}
                </Text>
                <Text style={styles.modalLine}>
                  {t("salesTableDate")}: {formatSaleDate(selected.createdAt)}
                </Text>
                <Text style={styles.modalLine}>
                  {t("salesTableTotal")}: {formatSaleMoney(selected.paymentTotal)}
                </Text>
                <Text style={styles.modalLine}>
                  {t("salesTablePayment")}:{" "}
                  {formatSalePaymentType(selected.paymentType)}
                </Text>
                {selected.couponCode ? (
                  <Text style={styles.modalLine}>
                    {t("coupon")}: {selected.couponCode}
                    {selected.couponDiscount
                      ? ` - ${selected.couponDiscount} TL`
                      : ""}
                  </Text>
                ) : null}
                {selected.tickets.map((ticket, idx) => (
                  <Text key={`t-${idx}`} style={styles.modalLine}>
                    {ticket.label} · {ticket.count} {t("pieces")}
                  </Text>
                ))}
                {selected.seats.map((seat, idx) => (
                  <Text key={`s-${idx}`} style={styles.modalLine}>
                    {seat.id} {seat.label}
                  </Text>
                ))}
              </ScrollView>
            ) : null}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelected(null)}
            >
              <Text style={styles.closeBtnText}>{t("close")}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 17,
    color: AppColors.heading,
  },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, gap: 12, paddingBottom: 40 },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  emptyCard: { alignItems: "center", gap: 8 },
  emptyTitle: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 16,
    color: AppColors.heading,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: "PoppinsRegular",
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  errorText: {
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    color: "#DC2626",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    gap: 4,
  },
  cardTablet: { padding: 16 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ref: {
    fontFamily: "PoppinsBold",
    fontSize: 13,
    color: AppColors.accent,
    textTransform: "uppercase",
  },
  status: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 12,
  },
  eventName: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 15,
    color: AppColors.heading,
    marginTop: 2,
  },
  meta: {
    fontFamily: "PoppinsRegular",
    fontSize: 12,
    color: "#6B7280",
  },
  amount: {
    fontFamily: "PoppinsBold",
    fontSize: 15,
    color: AppColors.heading,
    marginTop: 4,
  },
  footerHint: {
    textAlign: "center",
    fontFamily: "PoppinsRegular",
    fontSize: 12,
    color: "#6B7280",
    marginVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    gap: 10,
  },
  modalTitle: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 17,
    color: AppColors.heading,
  },
  modalEvent: {
    fontFamily: "PoppinsBold",
    fontSize: 15,
    color: AppColors.heading,
    marginBottom: 4,
  },
  modalLine: {
    fontFamily: "PoppinsRegular",
    fontSize: 13,
    color: AppColors.cardText,
    marginBottom: 4,
  },
  closeBtn: {
    marginTop: 8,
    height: 44,
    borderRadius: 10,
    backgroundColor: AppColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 14,
    color: "#fff",
  },
});
