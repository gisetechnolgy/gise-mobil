import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { GarantiPaymentWebView } from "../../../components/GarantiPaymentWebView";
import { AppColors } from "../../../constants/colors";
import { useRequireAuth } from "../../../hooks/useRequireAuth";
import {
  canPayAtDoor,
  CheckoutCancelledError,
  fetchEventCheckoutMeta,
  resolveCoupon,
  startEventCheckout,
  type CheckoutPaymentMethod,
} from "../../../lib/checkout";
import { fetchEventById } from "../../../lib/events";
import { fetchEventStockContext } from "../../../lib/eventStock";
import { holdSeatSelection } from "../../../lib/seatedCatalog";
import { ApiError } from "../../../lib/api";
import { tReplace } from "../../../lib/i18n";
import { useIsTablet } from "../../../lib/responsive";
import { formatMoneyTl } from "../../../lib/startingPrice";
import {
  applyCouponToCart,
  cartPayableTotal,
  getTicketCart,
  hydrateTicketCart,
  type TicketCartSnapshot,
} from "../../../lib/ticketCart";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/_LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);

function buildYears() {
  const current = new Date().getFullYear();
  return Array.from({ length: 16 }, (_, i) => String(current + i));
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function SelectBox({
  label,
  value,
  placeholder,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.selectBox}
    >
      <Text style={styles.selectLabel}>{label}</Text>
      <Text style={[styles.selectValue, !value && styles.selectPlaceholder]}>
        {value || placeholder}
      </Text>
    </TouchableOpacity>
  );
}

function OptionPickerModal({
  visible,
  title,
  options,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  options: string[];
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable style={styles.pickerCard} onPress={() => {}}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <ScrollView style={styles.pickerList}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                activeOpacity={0.85}
                style={styles.pickerOption}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Text style={styles.pickerOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function EventPaymentScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  useRequireAuth(id ? `/events/payment/${id}` : "/(tabs)/events");
  const [hydratedCart, setHydratedCart] = useState<TicketCartSnapshot | null>(
    () => getTicketCart(id),
  );
  const [cartReady, setCartReady] = useState(() => !!getTicketCart(id));
  const [event, setEvent] = useState<Awaited<
    ReturnType<typeof fetchEventById>
  > | null>(null);
  const [checkoutMeta, setCheckoutMeta] = useState<Awaited<
    ReturnType<typeof fetchEventCheckoutMeta>
  > | null>(null);
  const [stockCtx, setStockCtx] = useState<Awaited<
    ReturnType<typeof fetchEventStockContext>
  > | null>(null);
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cvv, setCvv] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [garantiVisible, setGarantiVisible] = useState(false);
  const [garantiInit, setGarantiInit] = useState<{
    action: string;
    fields: Record<string, string>;
    saleId: string;
  } | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState(false);
  const [cartVersion, setCartVersion] = useState(0);
  const [paymentMethod, setPaymentMethod] =
    useState<CheckoutPaymentMethod>("cc");
  const years = useMemo(() => buildYears(), []);

  // cartVersion force re-read after coupon apply
  const liveCart = useMemo(
    () => getTicketCart(id) ?? hydratedCart,
    [id, cartVersion, hydratedCart],
  );
  const activeCart = liveCart;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await hydrateTicketCart(id);
      if (cancelled) return;
      setHydratedCart(loaded);
      setCartReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !cartReady) return;
    if (!activeCart || activeCart.totalQuantity <= 0 || !activeCart.stockID) {
      router.replace(`/events/buy/${id}` as import("expo-router").Href);
      return;
    }
    void Promise.all([
      fetchEventById(id),
      fetchEventCheckoutMeta(id),
      fetchEventStockContext(id),
    ]).then(([ev, meta, stock]) => {
      setEvent(ev);
      setCheckoutMeta(meta);
      setStockCtx(stock);
    });
  }, [activeCart, cartReady, id, router]);

  const serviceFee =
    (activeCart?.totalPrice ?? 0) > 0
      ? activeCart?.serviceFee ?? checkoutMeta?.servicefee ?? 0
      : 0;
  const isDoorcash = paymentMethod === "doorcash";
  const doorcashAllowed = canPayAtDoor(checkoutMeta, activeCart);
  const totalIsZero = (activeCart?.totalPrice ?? 0) <= 0;
  // Kapıda ödemede kupon geçersiz (sunucu kuralı).
  const discount = isDoorcash ? 0 : activeCart?.coupon?.discount ?? 0;
  const total = activeCart
    ? cartPayableTotal({
        ...activeCart,
        serviceFee,
        coupon: isDoorcash ? null : activeCart.coupon,
      })
    : 0;
  const downPaymentLines = useMemo(
    () =>
      (activeCart?.lines ?? []).filter(
        (l) => l.hasDownPayment && (l.downPaymentAmount ?? 0) > 0,
      ),
    [activeCart],
  );
  const cardDigits = cardNumber.replace(/\s/g, "");
  const isCardValid =
    cardHolder.trim().length > 2 &&
    cardDigits.length >= 15 &&
    cvv.replace(/\D/g, "").length >= 3 &&
    !!month &&
    !!year;
  const isFormValid = totalIsZero || isDoorcash || isCardValid;

  useEffect(() => {
    if (paymentMethod === "doorcash" && !doorcashAllowed) {
      setPaymentMethod("cc");
    }
  }, [doorcashAllowed, paymentMethod]);

  const confirmTotal = (serverTotal: number, clientTotal: number) =>
    new Promise<boolean>((resolve) => {
      Alert.alert(
        t("serverTotalChangedTitle"),
        tReplace("serverTotalChangedMessage", {
          client: formatMoneyTl(clientTotal),
          server: formatMoneyTl(serverTotal),
        }),
        [
          {
            text: t("cancelLabel"),
            style: "cancel",
            onPress: () => resolve(false),
          },
          { text: t("continueLabel"), onPress: () => resolve(true) },
        ],
        { cancelable: false },
      );
    });

  const applyCoupon = () => {
    if (!checkoutMeta) return;
    const resolved = resolveCoupon(checkoutMeta, couponCode);
    if (!resolved) {
      setCouponError(true);
      applyCouponToCart(null);
      setCartVersion((v) => v + 1);
      return;
    }
    setCouponError(false);
    applyCouponToCart(resolved);
    setCartVersion((v) => v + 1);
  };

  const removeCoupon = () => {
    setCouponCode("");
    setCouponError(false);
    applyCouponToCart(null);
    setCartVersion((v) => v + 1);
  };

  const goToResult = (
    saleId: string,
    extra?: { err?: string | null; verify?: string | null; cancelled?: boolean },
  ) => {
    const params: Record<string, string> = { sid: saleId, eventId: id ?? "" };
    if (extra?.err) params.err = extra.err;
    if (extra?.verify) params.verify = extra.verify;
    if (extra?.cancelled) params.cancelled = "1";
    router.replace({
      pathname: "/events/payment/result",
      params,
    } as import("expo-router").Href);
  };

  /** Kullanıcı 3D ekranını kapattı: koltuk hold'larını bırak, sonuç ekranına "iptal" ile git. */
  const releaseSeatHolds = async () => {
    if (!activeCart || activeCart.mode !== "seats" || !user?.id) return;
    const sid = activeCart.stockID;
    if (!sid) return;
    await Promise.all(
      activeCart.seats.map((s) =>
        holdSeatSelection({
          stockID: sid,
          seatId: s.id,
          userId: user.id,
          hold: false,
        }).catch(() => {}),
      ),
    );
  };

  const onPay = async () => {
    if (!isFormValid || submitting || !activeCart || !id || !user) return;
    if (user.isEmailVerified === false) {
      Alert.alert(t("paymentSummary"), t("verifyEmailForPayment"));
      return;
    }
    // Seçili seans sepetten gelir; stockCtx (ilk seans) yalnızca sepet boşsa yedek.
    const effectiveStock = activeCart.stockID
      ? {
          stockRecordId: activeCart.stockID,
          stockID: activeCart.stockID,
          sessionMs: activeCart.sessionMs,
        }
      : stockCtx;
    if (!effectiveStock?.stockID) {
      Alert.alert(t("paymentSummary"), t("paymentStockMissing"));
      return;
    }
    if (!event || !checkoutMeta) {
      Alert.alert(t("paymentSummary"), t("paymentLoadError"));
      return;
    }

    if (!checkoutMeta.isActive) {
      Alert.alert(t("paymentSummary"), t("paymentLoadError"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await startEventCheckout({
        user,
        event,
        meta: checkoutMeta,
        stock: effectiveStock,
        cart: { ...activeCart, serviceFee },
        paymentMethod: isDoorcash ? "doorcash" : "cc",
        confirmTotal,
        card:
          !isDoorcash && !totalIsZero
            ? {
                cardHolder: cardHolder.trim(),
                cardNumber: cardDigits,
                cardCvv: cvv.replace(/\D/g, ""),
                cardExpireMonth: month,
                cardExpireYear: year,
              }
            : undefined,
      });

      if (result.kind === "local") {
        goToResult(result.saleId);
        return;
      }
      if (result.kind === "cancelled") return;

      setGarantiInit({
        action: result.init.action,
        fields: result.init.fields ?? {},
        saleId: result.saleId,
      });
      setGarantiVisible(true);
    } catch (err) {
      if (err instanceof CheckoutCancelledError) {
        // Kullanıcı sunucu tutarını onaylamadı; sale status 0 kalır, reconciler kapatır.
        return;
      }
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("paymentFailedMessage");
      Alert.alert(t("paymentFailedTitle"), message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!cartReady) {
    return (
      <SafeAreaView edges={["left", "right", "top"]} style={styles.safe}>
        <StatusBar style="dark" />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={AppColors.navBg} />
        </View>
      </SafeAreaView>
    );
  }

  if (!activeCart || activeCart.totalQuantity <= 0) {
    return (
      <SafeAreaView edges={["left", "right", "top"]} style={styles.safe}>
        <StatusBar style="dark" />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("paymentSummary")}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyCartText}>{t("cartEmptyHint")}</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.emptyCartBtn}
            onPress={() =>
              router.replace(
                (id
                  ? `/events/buy/${id}`
                  : "/(tabs)/events") as import("expo-router").Href,
              )
            }
          >
            <Text style={styles.emptyCartBtnText}>{t("buy")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["left", "right", "top"]} style={styles.safe}>
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      />

      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isTablet && styles.headerTitleTablet]}>
          {t("paymentSummary")}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: insets.bottom + 100,
          gap: 14,
        }}
      >
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>{t("yourSelections")}</Text>
          {activeCart.mode === "seats"
            ? activeCart.seats.map((seat) => (
                <View key={seat.id} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel} numberOfLines={2}>
                    {seat.title}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {formatMoneyTl(seat.price)}
                  </Text>
                </View>
              ))
            : activeCart.lines.map((line) => (
                <View key={line.productId}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel} numberOfLines={2}>
                      {line.title} (
                      {tReplace("ticketPieceLabel", {
                        count: String(line.quantity),
                      })}
                      )
                    </Text>
                    <Text style={styles.summaryValue}>
                      {formatMoneyTl(line.price * line.quantity)}
                    </Text>
                  </View>
                  {line.hasDownPayment && (line.downPaymentAmount ?? 0) > 0 ? (
                    <Text style={styles.downPaymentNote}>
                      {tReplace("downPaymentInfo", {
                        amount: formatMoneyTl(line.price * line.quantity),
                        rest: formatMoneyTl(
                          Math.max(
                            0,
                            ((line.fullPrice ?? line.price) - line.price) *
                              line.quantity,
                          ),
                        ),
                      })}
                    </Text>
                  ) : null}
                </View>
              ))}
          {discount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t("couponDiscount")}</Text>
              <Text style={styles.summaryValue}>
                -{formatMoneyTl(discount)}
              </Text>
            </View>
          ) : null}
          {downPaymentLines.length > 0 ? (
            <Text style={styles.downPaymentNote}>
              {tReplace("downPaymentTotalInfo", {
                amount: formatMoneyTl(total),
              })}
            </Text>
          ) : null}
          <View style={[styles.summaryRow, styles.summaryTotalRow]}>
            <Text style={styles.summaryTotalLabel}>
              {t("totalPrice")} (
              {tReplace("ticketPieceLabel", {
                count: String(activeCart.totalQuantity),
              })}
              )
            </Text>
            <Text style={styles.summaryTotalValue}>
              {formatMoneyTl(total)}
            </Text>
          </View>
        </View>

        {(checkoutMeta?.coupons?.length ?? 0) > 0 &&
        !isDoorcash &&
        !totalIsZero ? (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>{t("haveCoupon")}</Text>
            {activeCart.coupon ? (
              <View style={styles.couponAppliedRow}>
                <Text style={styles.couponAppliedText}>
                  {activeCart.coupon.code} (−{formatMoneyTl(activeCart.coupon.discount)})
                </Text>
                <TouchableOpacity onPress={removeCoupon}>
                  <Text style={styles.couponRemove}>{t("removeCoupon")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.couponRow}>
                <TextInput
                  value={couponCode}
                  onChangeText={(v) => {
                    setCouponCode(v);
                    if (couponError) setCouponError(false);
                  }}
                  placeholder={t("couponPlaceholder")}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  style={styles.couponInput}
                />
                <TouchableOpacity
                  onPress={applyCoupon}
                  style={styles.couponBtn}
                  disabled={couponCode.trim().length < 2}
                >
                  <Text style={styles.couponBtnText}>{t("applyCoupon")}</Text>
                </TouchableOpacity>
              </View>
            )}
            {couponError ? (
              <Text style={styles.couponError}>{t("invalidCoupon")}</Text>
            ) : null}
          </View>
        ) : null}

        {!totalIsZero ? (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>{t("paymentMethod")}</Text>
            <View style={styles.methodRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setPaymentMethod("cc")}
                style={[styles.methodBtn, !isDoorcash && styles.methodBtnOn]}
              >
                <Text
                  style={[
                    styles.methodBtnText,
                    !isDoorcash && styles.methodBtnTextOn,
                  ]}
                >
                  {t("creditCard")}
                </Text>
              </TouchableOpacity>
              {doorcashAllowed ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setPaymentMethod("doorcash")}
                  style={[styles.methodBtn, isDoorcash && styles.methodBtnOn]}
                >
                  <Text
                    style={[
                      styles.methodBtnText,
                      isDoorcash && styles.methodBtnTextOn,
                    ]}
                  >
                    {t("payAtDoor")}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {isDoorcash ? (
              <Text style={styles.methodHint}>{t("payAtDoorHint")}</Text>
            ) : null}
          </View>
        ) : null}

        {!totalIsZero && !isDoorcash ? (
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>{t("cardPaymentDetails")}</Text>

          <Text style={styles.fieldLabel}>{t("cardHolder")}</Text>
          <TextInput
            value={cardHolder}
            onChangeText={setCardHolder}
            placeholder={t("cardHolderPlaceholder")}
            placeholderTextColor="#9CA3AF"
            style={styles.underlineInput}
            autoCapitalize="words"
          />

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
            {t("cardNumber")}
          </Text>
          <TextInput
            value={cardNumber}
            onChangeText={(v) => setCardNumber(formatCardNumber(v))}
            placeholder={t("cardNumberPlaceholder")}
            placeholderTextColor="#9CA3AF"
            style={styles.underlineInput}
            keyboardType="number-pad"
            maxLength={19}
          />

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
            {t("cardCvv")}
          </Text>
          <TextInput
            value={cvv}
            onChangeText={(v) => setCvv(v.replace(/\D/g, "").slice(0, 4))}
            placeholder={t("cardCvvPlaceholder")}
            placeholderTextColor="#9CA3AF"
            style={styles.underlineInput}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
          />

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
            {t("cardExpiry")}
          </Text>
          <View style={styles.expiryRow}>
            <SelectBox
              label={t("cardMonth")}
              value={month}
              placeholder={t("cardSelect")}
              onPress={() => setMonthPickerOpen(true)}
            />
            <SelectBox
              label={t("cardYear")}
              value={year}
              placeholder={t("cardSelect")}
              onPress={() => setYearPickerOpen(true)}
            />
          </View>
        </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.payBar,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!isFormValid || submitting}
          onPress={() => void onPay()}
          style={[
            styles.payBtn,
            (!isFormValid || submitting) && styles.payBtnDisabled,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.payBtnText}>
              {isDoorcash || totalIsZero
                ? t("completeReservation")
                : t("makePayment")}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      </View>

      {garantiInit ? (
        <GarantiPaymentWebView
          visible={garantiVisible}
          title={t("securePayment")}
          action={garantiInit.action}
          fields={garantiInit.fields}
          onClose={() => {
            setGarantiVisible(false);
            // Banka tarafında işlem tamamlanmış olabilir; sonuç ekranı yine de sorgular.
            void releaseSeatHolds();
            goToResult(garantiInit.saleId, { cancelled: true });
          }}
          onComplete={(result) => {
            setGarantiVisible(false);
            goToResult(result.saleId, {
              err: result.err,
              verify: result.verify,
            });
          }}
        />
      ) : null}

      <OptionPickerModal
        visible={monthPickerOpen}
        title={t("cardMonth")}
        options={MONTHS}
        onClose={() => setMonthPickerOpen(false)}
        onSelect={setMonth}
      />
      <OptionPickerModal
        visible={yearPickerOpen}
        title={t("cardYear")}
        options={years}
        onClose={() => setYearPickerOpen(false)}
        onSelect={setYear}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#EFEFEF",
  },
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 14,
  },
  emptyCartText: {
    color: "#6B7280",
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    textAlign: "center",
  },
  emptyCartBtn: {
    backgroundColor: AppColors.accent,
    borderRadius: 12,
    paddingHorizontal: 20,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCartBtnText: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: 15,
  },
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
    color: "#0F2137",
    fontFamily: "PoppinsBold",
    fontSize: 17,
  },
  headerTitleTablet: {
    fontSize: 19,
  },
  headerSpacer: {
    width: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
  },
  cardSectionTitle: {
    color: "#9CA3AF",
    fontFamily: "PoppinsMedium",
    fontSize: 13,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  summaryTotalRow: {
    marginTop: 4,
    marginBottom: 0,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  summaryLabel: {
    flex: 1,
    color: AppColors.cardText,
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    lineHeight: 20,
  },
  summaryValue: {
    color: "#111827",
    fontFamily: "PoppinsBold",
    fontSize: 14,
  },
  summaryTotalLabel: {
    flex: 1,
    color: AppColors.cardText,
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    lineHeight: 20,
  },
  summaryTotalValue: {
    color: "#111827",
    fontFamily: "PoppinsBold",
    fontSize: 15,
  },
  methodRow: {
    flexDirection: "row",
    gap: 10,
  },
  methodBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  methodBtnOn: {
    backgroundColor: AppColors.navBg,
    borderColor: AppColors.navBg,
  },
  methodBtnText: {
    color: "#374151",
    fontFamily: "PoppinsBold",
    fontSize: 14,
  },
  methodBtnTextOn: {
    color: "#FFFFFF",
  },
  methodHint: {
    marginTop: 10,
    fontFamily: "PoppinsRegular",
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
  },
  downPaymentNote: {
    marginTop: -6,
    marginBottom: 10,
    fontFamily: "PoppinsRegular",
    fontSize: 12,
    lineHeight: 17,
    color: "#B45309",
  },
  fieldLabel: {
    color: "#111827",
    fontFamily: "PoppinsBold",
    fontSize: 14,
    marginBottom: 6,
  },
  fieldLabelSpaced: {
    marginTop: 16,
  },
  underlineInput: {
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    paddingVertical: 8,
    color: "#111827",
    fontFamily: "PoppinsRegular",
    fontSize: 14,
  },
  expiryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  selectBox: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectLabel: {
    color: "#111827",
    fontFamily: "PoppinsMedium",
    fontSize: 14,
  },
  selectValue: {
    color: "#111827",
    fontFamily: "PoppinsRegular",
    fontSize: 14,
  },
  selectPlaceholder: {
    color: "#9CA3AF",
  },
  payBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  payBtn: {
    backgroundColor: AppColors.accent,
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  payBtnText: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: 16,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  pickerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    maxHeight: 360,
    paddingTop: 14,
    paddingBottom: 8,
  },
  pickerTitle: {
    textAlign: "center",
    color: "#111827",
    fontFamily: "PoppinsBold",
    fontSize: 15,
    marginBottom: 8,
  },
  pickerList: {
    paddingHorizontal: 8,
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  pickerOptionText: {
    color: AppColors.cardText,
    fontFamily: "PoppinsMedium",
    fontSize: 15,
    textAlign: "center",
  },
  couponRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  couponInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    paddingVertical: 8,
    color: "#111827",
    fontFamily: "PoppinsRegular",
    fontSize: 14,
  },
  couponBtn: {
    backgroundColor: AppColors.navBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  couponBtnText: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: 13,
  },
  couponAppliedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  couponAppliedText: {
    fontFamily: "PoppinsMedium",
    fontSize: 14,
    color: "#111827",
  },
  couponRemove: {
    fontFamily: "PoppinsBold",
    fontSize: 13,
    color: "#DC2626",
  },
  couponError: {
    marginTop: 8,
    fontFamily: "PoppinsRegular",
    fontSize: 12,
    color: "#DC2626",
  },
});
