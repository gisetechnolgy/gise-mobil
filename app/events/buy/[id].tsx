import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { formatCityLabel } from "../../../lib/cities";
import {
  EventItem,
  eventImageCacheKey,
  fetchEventById,
  formatEventDate,
} from "../../../lib/events";
import {
  productsFromStock,
  type EventProductItem,
} from "../../../lib/eventProducts";
import { useIsTablet } from "../../../lib/responsive";
import { formatMoneyTl } from "../../../lib/startingPrice";
import { fetchEventCheckoutMeta } from "../../../lib/checkout";
import {
  fetchEventSessions,
  formatSessionLabel,
  type EventSession,
} from "../../../lib/eventStock";
import {
  buildTicketCart,
  cartPayableTotal,
  setTicketCart,
} from "../../../lib/ticketCart";
import { EventCardImage } from "../../components/_EventCardImage";
import { useTranslation } from "../../context/_LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";
import { tReplace } from "../../../lib/i18n";

function SelectableProductRow({
  product,
  quantity,
  isTablet,
  soldOutLabel,
  onChangeQuantity,
}: {
  product: EventProductItem;
  quantity: number;
  isTablet?: boolean;
  soldOutLabel: string;
  onChangeQuantity: (next: number) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(() => product.description.length > 0);
  const canExpand = product.description.length > 0;
  const maxQty = product.soldOut ? 0 : Math.max(0, product.remaining || 99);
  const canDecrease = quantity > 0;
  const canIncrease = !product.soldOut && quantity < maxQty;
  const isDownPayment =
    Boolean(product.hasDownPayment) &&
    (product.downPaymentAmount ?? 0) > 0;
  const fullPrice = product.fullPrice ?? product.price;
  const remainingAtVenue = Math.max(0, fullPrice - product.price);

  return (
    <View style={[styles.ticketCard, product.soldOut && styles.ticketCardSoldOut]}>
      <TouchableOpacity
        activeOpacity={canExpand ? 0.85 : 1}
        disabled={!canExpand}
        onPress={() => setOpen((v) => !v)}
        style={styles.ticketHeader}
      >
        <Text
          style={[styles.ticketTitle, isTablet && styles.ticketTitleTablet]}
          numberOfLines={3}
        >
          {product.title}
          {isDownPayment
            ? ` - ${tReplace("ticketTotalWithPrice", {
                amount: formatMoneyTl(fullPrice),
              })}`
            : ""}
          {product.soldOut ? (
            <Text style={styles.soldOut}> {soldOutLabel}</Text>
          ) : null}
        </Text>
        {canExpand ? (
          <View style={styles.chevronWrap}>
            <Ionicons
              name={open ? "chevron-up" : "chevron-down"}
              size={isTablet ? 20 : 18}
              color={AppColors.cardText}
            />
          </View>
        ) : null}
      </TouchableOpacity>

      {canExpand && open ? (
        <View style={styles.ticketDetails}>
          <Text
            style={[
              styles.ticketDescription,
              isTablet && styles.ticketDescriptionTablet,
            ]}
          >
            {product.description}
          </Text>
          {isDownPayment ? (
            <Text style={styles.downPaymentHint}>
              {tReplace("downPaymentRemainingInfo", {
                amount: formatMoneyTl(remainingAtVenue),
              })}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!canExpand && isDownPayment ? (
        <Text style={styles.downPaymentHint}>
          {tReplace("downPaymentRemainingInfo", {
            amount: formatMoneyTl(remainingAtVenue),
          })}
        </Text>
      ) : null}

      <View style={styles.ticketFooter}>
        <View style={styles.ticketPriceWrap}>
          <Text
            style={[styles.ticketPrice, isTablet && styles.ticketPriceTablet]}
          >
            {formatMoneyTl(product.price)}
          </Text>
          {isDownPayment ? (
            <Text style={styles.downPaymentLabel}>{t("downpayment")}</Text>
          ) : null}
        </View>
        <View style={styles.stepper}>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!canDecrease}
            onPress={() => onChangeQuantity(Math.max(0, quantity - 1))}
            style={[
              styles.stepperBtn,
              !canDecrease && styles.stepperBtnDisabled,
            ]}
          >
            <Ionicons name="remove" size={16} color="#374151" />
          </TouchableOpacity>
          <Text style={[styles.stepperValue, isTablet && styles.stepperValueTablet]}>
            {quantity}
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!canIncrease}
            onPress={() => onChangeQuantity(Math.min(maxQty, quantity + 1))}
            style={[
              styles.stepperBtn,
              !canIncrease && styles.stepperBtnDisabled,
            ]}
          >
            <Ionicons name="add" size={16} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function EventBuyScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [selectedStockID, setSelectedStockID] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [serviceFee, setServiceFee] = useState(0);
  const [commission, setCommission] = useState<{
    commissionFee: number;
    isCommissionExtra: boolean;
  }>({ commissionFee: 0, isCommissionExtra: false });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [eventData, sessionRows, checkoutMeta] = await Promise.all([
        fetchEventById(id),
        fetchEventSessions(id),
        fetchEventCheckoutMeta(id),
      ]);
      setEvent(eventData);
      setSessions(sessionRows);
      setSelectedStockID((prev) =>
        prev && sessionRows.some((s) => s.stockID === prev)
          ? prev
          : sessionRows[0]?.stockID ?? "",
      );
      setQuantities({});
      setServiceFee(Number(checkoutMeta.servicefee ?? 0) || 0);
      setCommission({
        commissionFee: Number(checkoutMeta.commissionFee ?? 0) || 0,
        isCommissionExtra: checkoutMeta.isCommissionExtra === true,
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load, locale]);

  const session = useMemo(
    () => sessions.find((s) => s.stockID === selectedStockID) ?? null,
    [sessions, selectedStockID],
  );
  // Ürünler seçili seansın stok satırından üretilir (çok seanslı etkinlik).
  const products = useMemo<EventProductItem[]>(
    () => (session ? productsFromStock(session.stock, commission) : []),
    // locale / komisyon değişince yeniden hesaplansın
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, locale, commission],
  );
  const stockID = session?.stockID ?? "";
  const sessionMs = session?.sessionMs ?? null;

  const selectSession = (next: string) => {
    if (next === selectedStockID) return;
    setSelectedStockID(next);
    setQuantities({});
  };

  const cart = useMemo(
    () =>
      id
        ? buildTicketCart(id, products, quantities, {
            stockID,
            sessionMs,
            serviceFee,
          })
        : null,
    [id, products, quantities, stockID, sessionMs, serviceFee],
  );

  const hasSelection = (cart?.totalQuantity ?? 0) > 0;
  const cityText = formatCityLabel(event?.city);
  const locationText = [event?.venueName, cityText].filter(Boolean).join(" / ");
  const bottomPad = hasSelection
    ? insets.bottom + 88
    : insets.bottom + 24;

  const openPayment = () => {
    if (!id || !cart || cart.totalQuantity <= 0) return;
    if (!cart.stockID) {
      return;
    }
    setTicketCart(cart);
    router.push(`/events/payment/${id}` as import("expo-router").Href);
  };

  return (
    <SafeAreaView
      edges={["left", "right", "top"]}
      style={styles.safe}
    >
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
          {t("buy")}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={AppColors.navBg} />
        </View>
      ) : !event ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t("eventNotFound")}</Text>
        </View>
      ) : (
        <View style={styles.body}>
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: bottomPad,
              gap: 14,
            }}
          >
            <View style={styles.eventCard}>
              <EventCardImage
                imageUrl={event.imageUrl}
                cacheKey={eventImageCacheKey(event)}
                recyclingKey={`${event.id}-buy-thumb`}
                style={styles.eventThumb}
              />
              <View style={styles.eventMeta}>
                <Text
                  style={[styles.eventTitle, isTablet && styles.eventTitleTablet]}
                  numberOfLines={2}
                >
                  {event.title}
                </Text>
                {!!locationText && (
                  <View style={styles.metaRow}>
                    <Ionicons
                      name="location"
                      size={14}
                      color={AppColors.cardText}
                    />
                    <Text
                      style={[styles.metaText, isTablet && styles.metaTextTablet]}
                      numberOfLines={2}
                    >
                      {locationText}
                    </Text>
                  </View>
                )}
                {!!event.startsAt && (
                  <View style={styles.metaRow}>
                    <Ionicons
                      name="calendar"
                      size={14}
                      color={AppColors.cardText}
                    />
                    <Text
                      style={[styles.metaText, isTablet && styles.metaTextTablet]}
                      numberOfLines={2}
                    >
                      {formatEventDate(event.startsAt)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {sessions.length > 1 ? (
              <>
                <Text
                  style={[styles.sectionLabel, isTablet && styles.sectionLabelTablet]}
                >
                  {t("sessionSection")}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.sessionRow}
                >
                  {sessions.map((s) => {
                    const isOn = s.stockID === selectedStockID;
                    return (
                      <TouchableOpacity
                        key={s.stockID}
                        activeOpacity={0.85}
                        onPress={() => selectSession(s.stockID)}
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
              </>
            ) : null}

            <Text
              style={[styles.sectionLabel, isTablet && styles.sectionLabelTablet]}
            >
              {t("ticketSection")}
            </Text>

            {products.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>{t("noTicketsAvailable")}</Text>
              </View>
            ) : (
              <View style={styles.ticketList}>
                {products.map((product) => (
                  <SelectableProductRow
                    key={product.id}
                    product={product}
                    quantity={quantities[product.id] ?? 0}
                    isTablet={isTablet}
                    soldOutLabel={t("soldOut")}
                    onChangeQuantity={(next) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [product.id]: next,
                      }))
                    }
                  />
                ))}
              </View>
            )}
          </ScrollView>

          {hasSelection && cart ? (
            <View
              style={[
                styles.checkoutBar,
                { paddingBottom: Math.max(insets.bottom, 12) },
              ]}
            >
              <View style={styles.checkoutLeft}>
                <Text
                  style={[
                    styles.checkoutTotal,
                    isTablet && styles.checkoutTotalTablet,
                  ]}
                  numberOfLines={1}
                >
                  {formatMoneyTl(cartPayableTotal(cart))}
                </Text>
                <Text style={styles.checkoutCount} numberOfLines={1}>
                  {tReplace("ticketCountLabel", {
                    count: String(cart.totalQuantity),
                  })}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={openPayment}
                style={styles.checkoutBtn}
              >
                <Text style={styles.checkoutBtnText}>{t("makePayment")}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#EFEFEF",
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  emptyText: {
    color: AppColors.cardText,
    textAlign: "center",
    fontFamily: "PoppinsRegular",
    fontSize: 14,
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  eventThumb: {
    width: 86,
    height: 108,
    borderRadius: 10,
    backgroundColor: "#E8ECF0",
  },
  eventMeta: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  eventTitle: {
    color: "#0F2137",
    fontFamily: "PoppinsBold",
    fontSize: 14,
    lineHeight: 18,
    textTransform: "uppercase",
  },
  eventTitleTablet: {
    fontSize: 16,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    flex: 1,
    color: "#1A1A1A",
    fontFamily: "PoppinsSemiBold",
    fontSize: 13,
    lineHeight: 17,
  },
  metaTextTablet: {
    fontSize: 13,
    lineHeight: 17,
  },
  sectionLabel: {
    color: "#0F2137",
    fontFamily: "PoppinsBold",
    fontSize: 16,
    marginTop: 2,
  },
  sectionLabelTablet: {
    fontSize: 16,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
  },
  sessionRow: {
    gap: 8,
    paddingVertical: 2,
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
  ticketList: {
    gap: 12,
  },
  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 15,
  },
  ticketCardSoldOut: {
    opacity: 0.55,
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ticketTitle: {
    flex: 1,
    color: "#0F2137",
    fontFamily: "PoppinsBold",
    fontSize: 14,
    lineHeight: 18,
    textTransform: "uppercase",
  },
  ticketTitleTablet: {
    fontSize: 15,
    lineHeight: 20,
  },
  soldOut: {
    color: "#C62828",
    fontFamily: "PoppinsMedium",
    fontSize: 13,
    textTransform: "none",
  },
  chevronWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketDetails: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  ticketDescription: {
    color: "#4B5563",
    fontFamily: "PoppinsRegular",
    fontSize: 13,
    lineHeight: 20,
  },
  ticketDescriptionTablet: {
    fontSize: 14,
    lineHeight: 21,
  },
  downPaymentHint: {
    marginTop: 8,
    color: "#C62828",
    fontFamily: "PoppinsRegular",
    fontSize: 12,
    lineHeight: 17,
  },
  ticketFooter: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ticketPriceWrap: {
    minWidth: 72,
    gap: 2,
  },
  ticketPrice: {
    color: "#0F2137",
    fontFamily: "PoppinsBold",
    fontSize: 16,
  },
  ticketPriceTablet: {
    fontSize: 17,
  },
  downPaymentLabel: {
    color: "#C62828",
    fontFamily: "PoppinsMedium",
    fontSize: 12,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  stepperValue: {
    minWidth: 40,
    textAlign: "center",
    color: "#0F2137",
    fontFamily: "PoppinsBold",
    fontSize: 14,
  },
  stepperValueTablet: {
    fontSize: 15,
  },
  checkoutBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  checkoutLeft: {
    flex: 1,
    minWidth: 0,
  },
  checkoutTotal: {
    color: "#0F2137",
    fontFamily: "PoppinsBold",
    fontSize: 18,
    lineHeight: 22,
  },
  checkoutTotalTablet: {
    fontSize: 20,
    lineHeight: 24,
  },
  checkoutCount: {
    color: "#6B7280",
    fontFamily: "PoppinsRegular",
    fontSize: 12,
    marginTop: 2,
  },
  checkoutFee: {
    color: "#6B7280",
    fontFamily: "PoppinsRegular",
    fontSize: 11,
    marginTop: 2,
  },
  checkoutBtn: {
    backgroundColor: AppColors.accent,
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 22,
    minWidth: 140,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutBtnText: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: 16,
  },
});
