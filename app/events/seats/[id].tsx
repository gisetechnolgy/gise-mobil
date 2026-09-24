import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppColors } from "../../../constants/colors";
import { useRequireAuth } from "../../../hooks/useRequireAuth";
import { fetchEventCheckoutMeta } from "../../../lib/checkout";
import { fetchEventById } from "../../../lib/events";
import {
  formatSessionLabel,
  type EventSession,
} from "../../../lib/eventStock";
import {
  fetchSeatedCatalog,
  holdSeatSelection,
  type SeatProductOption,
  type SeatableSeat,
} from "../../../lib/seatedCatalog";
import { formatMoneyTl } from "../../../lib/startingPrice";
import {
  buildSeatCart,
  setTicketCart,
  type SeatCartItem,
} from "../../../lib/ticketCart";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/_LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";

const MAX_SEATS = 10;

export default function EventSeatsScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  useRequireAuth(id ? `/events/seats/${id}` : "/(tabs)/events");

  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState<SeatableSeat[]>([]);
  const [products, setProducts] = useState<Map<string, SeatProductOption>>(
    () => new Map(),
  );
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [stockID, setStockID] = useState("");
  const [sessionMs, setSessionMs] = useState<number | null>(null);
  const [serviceFee, setServiceFee] = useState(0);
  const [selected, setSelected] = useState<SeatCartItem[]>([]);
  const [busySeat, setBusySeat] = useState<string | null>(null);
  // Ödemeye geçilmeden ekran kapatılırsa hold'lar serbest bırakılır.
  const selectedRef = useRef<SeatCartItem[]>([]);
  const stockIDRef = useRef("");
  const proceededRef = useRef(false);
  selectedRef.current = selected;
  stockIDRef.current = stockID;

  const load = useCallback(
    async (preferredStockID?: string) => {
      if (!id) return;
      setLoading(true);
      try {
        const [catalog, meta] = await Promise.all([
          fetchSeatedCatalog(id, preferredStockID ?? stockIDRef.current),
          fetchEventCheckoutMeta(id),
        ]);
        setSeats(catalog.seats);
        setProducts(catalog.products);
        setSessions(catalog.sessions);
        setStockID(catalog.stockID);
        setSessionMs(catalog.sessionMs);
        setServiceFee(
          Number(catalog.serviceFee ?? meta.servicefee ?? 0) || 0,
        );
      } catch {
        Alert.alert(t("paymentLoadError"));
      } finally {
        setLoading(false);
      }
    },
    [id, t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const releaseAllHolds = async () => {
    const userId = user?.id;
    const sid = stockIDRef.current;
    if (!userId || !sid) return;
    await Promise.all(
      selectedRef.current.map((seat) =>
        holdSeatSelection({ stockID: sid, seatId: seat.id, userId, hold: false }).catch(
          () => {},
        ),
      ),
    );
  };

  const selectSession = async (next: string) => {
    if (!next || next === stockID || busySeat) return;
    // Önceki seanstaki hold'ları bırak, seçimi sıfırla, yeni seansı yükle.
    await releaseAllHolds();
    setSelected([]);
    await load(next);
  };

  // Ödeme ekranından geri dönüldüğünde hold'lar yeniden bu ekranın sorumluluğunda.
  useFocusEffect(
    useCallback(() => {
      proceededRef.current = false;
    }, []),
  );

  useEffect(() => {
    const userId = user?.id;
    return () => {
      if (proceededRef.current || !userId || !stockIDRef.current) return;
      for (const seat of selectedRef.current) {
        void holdSeatSelection({
          stockID: stockIDRef.current,
          seatId: seat.id,
          userId,
          hold: false,
        }).catch(() => {});
      }
    };
  }, [user?.id]);

  const selectedIds = useMemo(
    () => new Set(selected.map((s) => s.id)),
    [selected],
  );

  const total = selected.reduce((sum, s) => sum + s.price, 0);
  const payableTotal =
    total > 0 ? Math.max(0, total + (serviceFee || 0)) : 0;

  const promoFor = (productId: string): SeatProductOption | null => {
    const p = products.get(productId);
    if (!p || !p.isPromotionAvailable || p.promotionPrice == null) return null;
    return p;
  };

  const setSeatPromotion = (seatId: string, usePromo: boolean) => {
    setSelected((prev) =>
      prev.map((s) => {
        if (s.id !== seatId) return s;
        const p = promoFor(s.productID);
        const base = products.get(s.productID);
        if (!p || !base) return s;
        return {
          ...s,
          isPromotionSelected: usePromo,
          promotionTitle: usePromo
            ? `${seatId} · ${p.promotionLabel ?? base.title}`
            : null,
          price: usePromo ? (p.promotionPrice as number) : base.price,
        };
      }),
    );
  };

  const toggleSeat = async (seat: SeatableSeat) => {
    if (!user?.id || !stockID || busySeat) return;
    if (seat.status === 1) return;

    const isSelected = selectedIds.has(seat.id);
    if (!isSelected && selected.length >= MAX_SEATS) {
      Alert.alert(t("seatLimitReached"));
      return;
    }

    setBusySeat(seat.id);
    try {
      await holdSeatSelection({
        stockID,
        seatId: seat.id,
        userId: user.id,
        hold: !isSelected,
      });
      setSelected((prev) => {
        if (isSelected) return prev.filter((s) => s.id !== seat.id);
        return [
          ...prev,
          {
            id: seat.id,
            productID: seat.productId,
            title: `${seat.id} · ${seat.productTitle}`,
            price: seat.price,
          },
        ];
      });
      setSeats((prev) =>
        prev.map((s) =>
          s.id === seat.id ? { ...s, status: isSelected ? 0 : 2 } : s,
        ),
      );
    } catch {
      Alert.alert(t("seatHoldFailed"));
      void load();
    } finally {
      setBusySeat(null);
    }
  };

  const goPayment = async () => {
    if (!id || selected.length === 0 || !stockID) return;
    await fetchEventById(id);
    const cart = buildSeatCart(id, selected, {
      stockID,
      sessionMs,
      serviceFee,
    });
    setTicketCart(cart);
    proceededRef.current = true;
    router.push(`/events/payment/${id}` as import("expo-router").Href);
  };

  const available = seats.filter((s) => s.status !== 1);
  const free = available.filter((s) => s.status === 0 || selectedIds.has(s.id));

  return (
    <SafeAreaView edges={["left", "right", "top"]} style={styles.safe}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("selectSeats")}</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AppColors.navBg} />
        </View>
      ) : (
        <View style={styles.body}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: insets.bottom + 100,
              gap: 8,
            }}
          >
            {sessions.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sessionRow}
              >
                {sessions.map((s) => {
                  const isOn = s.stockID === stockID;
                  return (
                    <TouchableOpacity
                      key={s.stockID}
                      activeOpacity={0.85}
                      onPress={() => void selectSession(s.stockID)}
                      style={[styles.sessionChip, isOn && styles.sessionChipOn]}
                    >
                      <Text
                        style={[
                          styles.sessionChipText,
                          isOn && styles.sessionChipTextOn,
                        ]}
                      >
                        {formatSessionLabel(s, locale)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}
            <Text style={styles.hint}>{t("selectSeatsHint")}</Text>
            {free.length === 0 ? (
              <Text style={styles.empty}>{t("noSeatsAvailable")}</Text>
            ) : (
              free.map((seat) => {
                const isOn = selectedIds.has(seat.id);
                const sel = selected.find((s) => s.id === seat.id);
                const promo = isOn ? promoFor(seat.productId) : null;
                const usePromo = !!sel?.isPromotionSelected;
                return (
                  <View key={seat.id}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={busySeat === seat.id}
                      onPress={() => void toggleSeat(seat)}
                      style={[
                        styles.seatRow,
                        isOn && styles.seatRowOn,
                        promo && styles.seatRowWithPromo,
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.seatId, isOn && styles.seatIdOn]}>
                          {seat.id}
                        </Text>
                        <Text style={[styles.seatProduct, isOn && styles.seatProductOn]}>
                          {seat.productTitle}
                        </Text>
                      </View>
                      <Text style={[styles.seatPrice, isOn && styles.seatIdOn]}>
                        {formatMoneyTl(sel?.price ?? seat.price)}
                      </Text>
                      <Ionicons
                        name={isOn ? "checkbox" : "square-outline"}
                        size={22}
                        color={isOn ? "#FFFFFF" : AppColors.navBg}
                        style={{ marginLeft: 10 }}
                      />
                    </TouchableOpacity>
                    {promo ? (
                      <View style={styles.promoRow}>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => setSeatPromotion(seat.id, false)}
                          style={[styles.promoBtn, !usePromo && styles.promoBtnOn]}
                        >
                          <Text style={[styles.promoBtnText, !usePromo && styles.promoBtnTextOn]}>
                            {t("seatStandardOption")} · {formatMoneyTl(seat.price)}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => setSeatPromotion(seat.id, true)}
                          style={[styles.promoBtn, usePromo && styles.promoBtnOn]}
                        >
                          <Text style={[styles.promoBtnText, usePromo && styles.promoBtnTextOn]}>
                            {promo.promotionLabel ?? t("seatPromotionOption")} ·{" "}
                            {formatMoneyTl(promo.promotionPrice as number)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>

          <View
            style={[
              styles.bar,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.barCount}>
                {selected.length} {t("seatUnit")}
              </Text>
              <Text style={styles.barTotal} numberOfLines={1}>
                {formatMoneyTl(payableTotal)}
              </Text>
            </View>
            <TouchableOpacity
              disabled={selected.length === 0}
              onPress={() => void goPayment()}
              style={[
                styles.payBtn,
                selected.length === 0 && styles.payBtnDisabled,
              ]}
            >
              <Text style={styles.payBtnText}>{t("makePayment")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#EFEFEF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "PoppinsBold",
    fontSize: 17,
    color: "#0F2137",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { flex: 1 },
  scroll: { flex: 1 },
  sessionRow: {
    gap: 8,
    paddingBottom: 6,
  },
  sessionChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  sessionChipOn: {
    backgroundColor: AppColors.navBg,
    borderColor: AppColors.navBg,
  },
  sessionChipText: {
    color: "#374151",
    fontFamily: "PoppinsMedium",
    fontSize: 13,
  },
  sessionChipTextOn: {
    color: "#FFFFFF",
  },
  hint: {
    fontFamily: "PoppinsRegular",
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  empty: {
    fontFamily: "PoppinsMedium",
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 40,
  },
  seatRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 15,
  },
  seatRowOn: { backgroundColor: AppColors.accent },
  seatRowWithPromo: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  seatProductOn: { color: "rgba(255,255,255,0.85)" },
  promoRow: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
  },
  promoBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  promoBtnOn: {
    borderColor: AppColors.navBg,
    backgroundColor: AppColors.navBg,
  },
  promoBtnText: {
    fontFamily: "PoppinsMedium",
    fontSize: 12,
    color: "#374151",
    textAlign: "center",
  },
  promoBtnTextOn: { color: "#FFFFFF" },
  seatId: {
    fontFamily: "PoppinsBold",
    fontSize: 15,
    color: "#0F2137",
  },
  seatIdOn: { color: "#FFFFFF" },
  seatProduct: {
    fontFamily: "PoppinsRegular",
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  seatPrice: {
    fontFamily: "PoppinsBold",
    fontSize: 14,
    color: "#0F2137",
  },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  barCount: {
    fontFamily: "PoppinsRegular",
    fontSize: 12,
    color: "#6B7280",
  },
  barTotal: {
    fontFamily: "PoppinsBold",
    fontSize: 16,
    color: "#0F2137",
  },
  barFee: {
    fontFamily: "PoppinsRegular",
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  payBtn: {
    backgroundColor: AppColors.accent,
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnDisabled: { backgroundColor: "#D1D5DB" },
  payBtnText: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: 16,
  },
});
