import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { AppColors } from "../../constants/colors";
import {
  COMPACT,
  EVENT_CARD_SHADOW,
  HOME_SECTION_CARD_IMAGE_ASPECT,
} from "../../constants/homeSection";
import {
  EventItem,
  eventImageCacheKey,
  formatEventDateLong,
  formatEventTime,
} from "../../lib/events";
import { formatHomePriceAmount } from "../../lib/startingPrice";
import type { ActivePriceInfo } from "../../lib/startingPrice";
import { resolveEventCardBadge } from "../../lib/urgencyBadge";
import { EventCardImage } from "./_EventCardImage";
import { AppText as Text } from "@/components/ui/AppText";
import { useTranslation } from "../context/_LocaleContext";
import { getAppLocale } from "../../lib/appLocale";

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
  const priceInfo = event.priceInfo;
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
  const displayName =
    rawName.length > 30 ? `${rawName.slice(0, 30)}...` : rawName;

  const dateLabel = formatEventDateLong(event.startsAt);
  const timeLabel = formatEventTime(event.startsAt);
  const dateTimeLabel = timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel;
  const venueLabel = event.venueName?.trim() || "";

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
        <Text style={styles.title} numberOfLines={1}>
          {displayName}
        </Text>
        {dateTimeLabel ? (
          <Text style={styles.meta} numberOfLines={1}>
            {dateTimeLabel}
          </Text>
        ) : null}
        {venueLabel ? (
          <Text style={styles.meta} numberOfLines={1}>
            {venueLabel}
          </Text>
        ) : null}

        <View style={styles.footer}>
          {priceInfo ? (
            <Text style={styles.priceLine}>
              <Text style={styles.priceAmount}>
                {formatHomePriceAmount(priceInfo.minPrice)}
              </Text>
              <Text style={styles.priceSuffix}>
                {` ${t("heroPriceFromSuffix")}`}
              </Text>
            </Text>
          ) : (
            <View />
          )}
          <Text style={styles.buyLabel}>{t("buy")}</Text>
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
        <View style={[styles.skeletonLine, { width: "88%", height: 14 }]} />
        <View style={[styles.skeletonLine, { width: "70%", height: 10 }]} />
        <View style={[styles.skeletonLine, { width: "55%", height: 10 }]} />
        <View style={[styles.skeletonLine, { width: "40%", height: 12 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
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
  },
  meta: {
    color: "#808080",
    fontFamily: "PoppinsRegular",
    fontSize: COMPACT.metaSize,
    lineHeight: Math.round(COMPACT.metaSize * 1.25),
  },
  footer: {
    marginTop: "auto",
    paddingTop: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  priceLine: {
    flex: 1,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  priceAmount: {
    color: AppColors.accent,
    fontFamily: "PoppinsBold",
    fontSize: COMPACT.priceSize,
  },
  priceSuffix: {
    color: "#6B7280",
    fontFamily: "PoppinsRegular",
    fontSize: COMPACT.priceSuffixSize,
  },
  buyLabel: {
    color: AppColors.accent,
    fontFamily: "PoppinsBold",
    fontSize: COMPACT.buySize,
    flexShrink: 0,
    marginTop: 1,
  },
  skeleton: {
    backgroundColor: "#E8ECF0",
  },
  skeletonLine: {
    borderRadius: 4,
    backgroundColor: "#E8ECF0",
  },
});
