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
  fetchEventProducts,
  type EventProductItem,
} from "../../../lib/eventProducts";
import { useIsTablet } from "../../../lib/responsive";
import { formatMoneyTl } from "../../../lib/startingPrice";
import {
  buildTicketCart,
  setTicketCart,
} from "../../../lib/ticketCart";
import { EventCardImage } from "../../components/EventCardImage";
import { useTranslation } from "../../context/LocaleContext";
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
  const [open, setOpen] = useState(() => product.description.length > 0);
  const canExpand = product.description.length > 0;
  const maxQty = product.soldOut ? 0 : Math.max(0, product.remaining || 99);
  const canDecrease = quantity > 0;
  const canIncrease = !product.soldOut && quantity < maxQty;

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
          numberOfLines={2}
        >
          {product.title}
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
        </View>
      ) : null}

      <View style={styles.ticketFooter}>
        <Text style={[styles.ticketPrice, isTablet && styles.ticketPriceTablet]}>
          {formatMoneyTl(product.price)}
        </Text>
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
            <Ionicons name="remove" size={18} color="#FFFFFF" />
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
            <Ionicons name="add" size={18} color="#FFFFFF" />
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
  const [products, setProducts] = useState<EventProductItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [eventData, productRows] = await Promise.all([
        fetchEventById(id),
        fetchEventProducts(id),
      ]);
      setEvent(eventData);
      setProducts(productRows);
      setQuantities({});
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load, locale]);

  const cart = useMemo(
    () => (id ? buildTicketCart(id, products, quantities) : null),
    [id, products, quantities],
  );

  const hasSelection = (cart?.totalQuantity ?? 0) > 0;
  const cityText = formatCityLabel(event?.city);
  const locationText = [event?.venueName, cityText].filter(Boolean).join(" / ");
  const bottomPad = hasSelection
    ? insets.bottom + 88
    : insets.bottom + 24;

  const openPayment = () => {
    if (!id || !cart || cart.totalQuantity <= 0) return;
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
        <>
          <ScrollView
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
                >
                  {formatMoneyTl(cart.totalPrice)}
                </Text>
                <Text style={styles.checkoutCount}>
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
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: AppColors.background,
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
    color: "#111827",
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
  emptyText: {
    color: AppColors.cardText,
    textAlign: "center",
    fontFamily: "PoppinsRegular",
    fontSize: 14,
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  eventThumb: {
    width: 84,
    height: 84,
    borderRadius: 10,
    backgroundColor: "#E8ECF0",
  },
  eventMeta: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  eventTitle: {
    color: "#111827",
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
    gap: 6,
  },
  metaText: {
    flex: 1,
    color: AppColors.cardText,
    fontFamily: "PoppinsRegular",
    fontSize: 12,
    lineHeight: 16,
  },
  metaTextTablet: {
    fontSize: 13,
    lineHeight: 17,
  },
  sectionLabel: {
    color: "#111827",
    fontFamily: "PoppinsBold",
    fontSize: 14,
    marginTop: 2,
  },
  sectionLabelTablet: {
    fontSize: 15,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
  },
  ticketList: {
    gap: 12,
  },
  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
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
    color: "#111827",
    fontFamily: "PoppinsBold",
    fontSize: 15,
    lineHeight: 20,
    textTransform: "uppercase",
  },
  ticketTitleTablet: {
    fontSize: 16,
    lineHeight: 21,
  },
  soldOut: {
    color: "#C62828",
    fontFamily: "PoppinsMedium",
    fontSize: 13,
    textTransform: "none",
  },
  chevronWrap: {
    width: 28,
    height: 28,
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
  ticketFooter: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ticketPrice: {
    color: "#111827",
    fontFamily: "PoppinsBold",
    fontSize: 16,
  },
  ticketPriceTablet: {
    fontSize: 17,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: AppColors.navBg,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  stepperValue: {
    minWidth: 18,
    textAlign: "center",
    color: "#111827",
    fontFamily: "PoppinsBold",
    fontSize: 16,
  },
  stepperValueTablet: {
    fontSize: 17,
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  checkoutLeft: {
    flexShrink: 1,
  },
  checkoutTotal: {
    color: "#111827",
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
    fontSize: 13,
    marginTop: 2,
  },
  checkoutBtn: {
    backgroundColor: AppColors.navBg,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 14,
    minWidth: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutBtnText: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: 15,
  },
});
