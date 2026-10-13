import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { AppColors } from "../../constants/colors";
import {
  COMPACT,
  EVENT_CARD_SHADOW,
  HOME_SECTION_CARD_IMAGE_ASPECT,
} from "../../constants/homeSection";
import { CARD_TEXT } from "../../constants/homeSectionList";
import {
  EventItem,
  eventImageCacheKey,
  formatEventDateLong,
  formatEventTime,
} from "../../lib/events";
import { formatPriceRangeLabel } from "../../lib/startingPrice";
import type { ActivePriceInfo } from "../../lib/startingPrice";
import { resolveEventCardBadge } from "../../lib/urgencyBadge";
import { EventCardImage } from "./_EventCardImage";
import { AppText as Text } from "@/components/ui/AppText";
import { useTranslation } from "../context/_LocaleContext";
import { getAppLocale } from "../../lib/appLocale";
import { formatCityLabel } from "../../lib/cities";

/** Web ile aynı: type === 3 koltuklu etkinlik */
const SEATED_EVENT_TYPE = 3;

type Props = {
  event: EventItem & {
    featuredImageUrl?: string | null;
    bannerCardUrl?: string | null;
    priceInfo?: ActivePriceInfo | null;
    remainingTickets?: number | null;
    urgency?: Record<string, unknown> | null;
    badge?: {
      label?: { tr?: string; en?: string } | string;
      textColor?: string;
      backgroundColor?: string;
    } | null;
  };
  width?: number;
  /** Web fluid: genişlik %100, görsel oranı 344/194 kilitli */
  fluid?: boolean;
  isFeatured?: boolean;
  /** Varsayılan: /events/[id] — admin modda /admin/events/[id] */
  href?: import("expo-router").Href;
};

export const HOME_EVENT_CARD_SCALE = 1;

/** Kart 1 + kart 2 ortak tipografi — hero kart da bunları kullanır */
export const CARD_META_SIZE = CARD_TEXT.metaSize;
export const CARD_PRICE_SIZE = CARD_TEXT.priceSize;

/** Fiyat + Satın Al aynı satır yüksekliği → dikeyde aynı hiza */
const FOOTER_LINE_HEIGHT = Math.round(
  Math.max(CARD_PRICE_SIZE, COMPACT.buySize) * 1.3,
);

/** İkon boyu = yazı boyu */
const META_ICON_SIZE = CARD_META_SIZE;
/** Feather ikonlarının iç boşluğu (3/24) telafi — ikon başlığın ilk harfiyle aynı çizgide */
const META_ICON_OFFSET = -(META_ICON_SIZE * 3) / 24;

export function getHomeEventCardWidth(
  _screenWidth?: number,
  _isTablet?: boolean,
) {
  return COMPACT.width;
}

export default function HomeEventCard({
  event,
  width: widthProp,
  fluid = false,
  isFeatured = false,
  href,
}: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const cardWidth = fluid ? undefined : (widthProp ?? COMPACT.width);
  const imageUrl =
    (isFeatured && event.featuredImageUrl) ||
    event.bannerCardUrl ||
    event.imageUrl;
  const priceLabel = formatPriceRangeLabel(event.priceInfo, t("freeOfCharge"));
  const cardBadge = resolveEventCardBadge(
    {
      urgency: event.urgency,
      startsAt: event.startsAt,
      remainingTickets: event.remainingTickets,
      badge: event.badge,
    },
    { locale: getAppLocale() },
  );
  const showSeatIcon = event.type === SEATED_EVENT_TYPE;

  const rawName = event.title ?? "";

  const dateLabel = formatEventDateLong(event.startsAt);
  const timeLabel = formatEventTime(event.startsAt);
  const dateTimeLabel = timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel;
  const venueLabel = [event.venueName?.trim(), formatCityLabel(event.city)]
    .filter(Boolean)
    .join(", ");

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() =>
        router.push(href ?? (`/events/${event.id}` as import("expo-router").Href))
      }
      style={[
        styles.card,
        EVENT_CARD_SHADOW,
        {
          width: fluid ? ("100%" as const) : cardWidth,
          borderRadius: COMPACT.borderRadius,
        },
      ]}
    >
      <View
        style={[
          styles.cover,
          {
            // Oran her zaman 344:194 — yükseklik width'ten gelir
            aspectRatio: HOME_SECTION_CARD_IMAGE_ASPECT,
            borderTopLeftRadius: COMPACT.borderRadius,
            borderTopRightRadius: COMPACT.borderRadius,
            borderBottomLeftRadius: COMPACT.imageBottomRadius,
            borderBottomRightRadius: COMPACT.imageBottomRadius,
          },
        ]}
      >
        <EventCardImage
          imageUrl={imageUrl}
          cacheKey={eventImageCacheKey({ id: event.id, imageUrl })}
          recyclingKey={event.id}
          style={[
            styles.image,
            {
              borderTopLeftRadius: COMPACT.borderRadius,
              borderTopRightRadius: COMPACT.borderRadius,
              borderBottomLeftRadius: COMPACT.imageBottomRadius,
              borderBottomRightRadius: COMPACT.imageBottomRadius,
            },
          ]}
          contentFit="cover"
        />

        {cardBadge ? (
          <View style={styles.badgeWrap}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: `#${cardBadge.backgroundColor || "AE256D"}`,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: `#${cardBadge.textColor || "FFFFFF"}` },
                ]}
                numberOfLines={1}
              >
                {cardBadge.displayLabel}
              </Text>
            </View>
          </View>
        ) : null}

        {showSeatIcon ? (
          <View style={styles.seatBadge}>
            <MaterialIcons name="event-seat" size={16} color="#FFFFFF" />
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.content,
          {
            paddingHorizontal: COMPACT.textPaddingX,
            paddingVertical: COMPACT.textPaddingY,
            gap: COMPACT.textLineGap,
            minHeight: 96,
          },
        ]}
      >
        <View style={styles.titleBox}>
          <Text style={styles.title} numberOfLines={2}>
            {rawName}
          </Text>
        </View>
        {dateTimeLabel ? (
          <View style={styles.metaRow}>
            <Feather
              name="calendar"
              size={META_ICON_SIZE}
              color={AppColors.accent}
              style={styles.metaIcon}
            />
            <Text style={styles.meta} numberOfLines={1}>
              {dateTimeLabel}
            </Text>
          </View>
        ) : null}
        {venueLabel ? (
          <View style={styles.metaRow}>
            <Feather
              name="map-pin"
              size={META_ICON_SIZE}
              color={AppColors.accent}
              style={styles.metaIcon}
            />
            <Text style={styles.meta} numberOfLines={1}>
              {venueLabel}
            </Text>
          </View>
        ) : null}

        <View style={styles.dividerWrap}>
          <View style={styles.divider} />
        </View>

        <View style={styles.footer}>
          {priceLabel ? (
            <View style={styles.priceLine}>
              <Text style={styles.priceCaption} numberOfLines={1}>
                {t("ticketPriceLabel")}
              </Text>
              <Text style={styles.priceAmount} numberOfLines={1}>
                {priceLabel}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <View style={styles.buyBox}>
            <Text style={styles.buyLabel} numberOfLines={1}>
              {t("buy")}
            </Text>
            <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function HomeEventCardSkeleton({ width }: { width?: number }) {
  return (
    <View
      style={[
        styles.card,
        EVENT_CARD_SHADOW,
        {
          width: width ?? COMPACT.width,
          borderRadius: COMPACT.borderRadius,
        },
      ]}
    >
      <View
        style={[
          styles.cover,
          styles.skeleton,
          { aspectRatio: HOME_SECTION_CARD_IMAGE_ASPECT },
        ]}
      />
      <View
        style={{
          paddingHorizontal: COMPACT.textPaddingX,
          paddingVertical: COMPACT.textPaddingY,
          gap: COMPACT.textLineGap,
          minHeight: 96,
        }}
      >
        {/* Başlık: gerçek kartta hep 2 satır yer */}
        <View
          style={{
            height: Math.round(COMPACT.titleSize * 1.25) * 2,
            justifyContent: "center",
            gap: 4,
          }}
        >
          <View style={[styles.skeletonLine, { width: "88%", height: 13 }]} />
          <View style={[styles.skeletonLine, { width: "62%", height: 13 }]} />
        </View>
        <View style={[styles.skeletonLine, { width: "70%", height: 10 }]} />
        <View style={[styles.skeletonLine, { width: "55%", height: 10 }]} />
        <View style={[styles.skeletonLine, { width: "48%", height: 12 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  cover: {
    width: "100%",
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  badgeWrap: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 5,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: "90%",
  },
  badgeText: {
    fontFamily: "PoppinsBold",
    fontSize: 11,
    lineHeight: 14,
  },
  seatBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: AppColors.accent,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  content: {
    flexGrow: 1,
  },
  title: {
    color: AppColors.heading,
    fontFamily: "PoppinsBold",
    fontSize: COMPACT.titleSize,
    lineHeight: Math.round(COMPACT.titleSize * 1.25),
    textTransform: "uppercase",
  },
  /** Her zaman 2 satır yer (sabit kart boyu); tek satırlık isim dikeyde ortalanır */
  titleBox: {
    height: Math.round(COMPACT.titleSize * 1.25) * 2,
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaIcon: {
    marginLeft: META_ICON_OFFSET,
  },
  meta: {
    flex: 1,
    minWidth: 0,
    color: "#4B5563",
    fontFamily: "PoppinsRegular",
    fontSize: CARD_META_SIZE,
    lineHeight: Math.round(CARD_META_SIZE * 1.25),
  },
  /** Mekan ile fiyat arasındaki boşluğu doldurur; çizgi tam ortada → üst/alt mesafe eşit */
  dividerWrap: {
    flexGrow: 1,
    minHeight: 8,
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#EDEDED",
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  priceLine: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    alignItems: "flex-start",
  },
  priceCaption: {
    color: "#6B7280",
    fontFamily: "PoppinsRegular",
    fontSize: CARD_META_SIZE - 2,
    lineHeight: Math.round((CARD_META_SIZE - 2) * 1.3),
  },
  priceAmount: {
    color: AppColors.accent,
    fontFamily: "PoppinsBold",
    fontSize: CARD_PRICE_SIZE,
    lineHeight: FOOTER_LINE_HEIGHT,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  buyBox: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: AppColors.accent,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  buyLabel: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: COMPACT.buySize,
    lineHeight: FOOTER_LINE_HEIGHT,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  skeleton: {
    backgroundColor: "#E8ECF0",
  },
  skeletonLine: {
    borderRadius: 4,
    backgroundColor: "#E8ECF0",
  },
});
