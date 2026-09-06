import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { AppColors } from "../../constants/colors";
import { formatVenueLine } from "../../lib/formatVenueLine";
import {
  EventItem,
  eventImageCacheKey,
  formatEventDateLong,
  formatEventDay,
  formatEventMonthShort,
  formatEventTime,
} from "../../lib/events";
import { formatPriceTl } from "../../lib/startingPrice";
import type { ActivePriceInfo } from "../../lib/startingPrice";
import { resolveEventCardBadge } from "../../lib/urgencyBadge";
import { HOME_CARD_BORDER_RADIUS, useIsTablet } from "../../lib/responsive";
import { EventCardImage } from "./EventCardImage";
import { AppText as Text } from "@/components/ui/AppText";
import { t } from "../../lib/i18n";
import { getAppLocale } from "../../lib/appLocale";

/** Web ile aynı: type === 3 koltuklu etkinlik */
const SEATED_EVENT_TYPE = 3;

type Props = {
  event: EventItem & {
    featuredImageUrl?: string | null;
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
  isFeatured?: boolean;
};

/** Ana sayfa etkinlik kartı ölçeği — oran korunur, tüm içerik buna göre küçülür. */
export const HOME_EVENT_CARD_SCALE = 0.88;

function scaleCard(value: number) {
  return Math.round(value * HOME_EVENT_CARD_SCALE);
}

/** Rozet metni — lineHeight oranı korunur, sıkışma olmaz. */
function scaleBadgeText(fontSize: number, lineHeight: number) {
  const scaledSize = Math.round(fontSize * HOME_EVENT_CARD_SCALE);
  const lineRatio = lineHeight / fontSize;
  return {
    fontSize: scaledSize,
    lineHeight: Math.max(Math.round(scaledSize * lineRatio), scaledSize + 1),
  };
}

const DATE_BADGE_DAY = scaleBadgeText(12, 13);
const DATE_BADGE_MONTH = scaleBadgeText(14, 15);

export function getHomeEventCardWidth(screenWidth: number, isTablet: boolean) {
  const base = Math.round(screenWidth * (isTablet ? 0.31 : 0.59));
  return scaleCard(base);
}

const IMAGE_INSET = scaleCard(6);
const IMAGE_HEIGHT_RATIO = 0.94;

/** Tarih rozeti — kartla aynı ölçekte, metin oranları korunur. */
const DATE_BADGE = {
  minWidth: scaleCard(44),
  minHeight: scaleCard(48),
  borderRadius: scaleCard(12),
  offset: scaleCard(10),
  paddingH: scaleCard(4),
  paddingV: scaleCard(5),
  monthMarginTop: scaleCard(1),
} as const;

function EventDateBadge({ dateIso }: { dateIso: string }) {
  const day = formatEventDay(dateIso);
  const month = formatEventMonthShort(dateIso);
  if (!day) return null;

  return (
    <View style={styles.dateBadge}>
      <Text style={styles.dateDay}>{day}</Text>
      {month ? <Text style={styles.dateMonth}>{month}</Text> : null}
    </View>
  );
}

/** Web SeatIndicator — primary kutuda koltuk ikonu */
function SeatBadge() {
  return (
    <View style={styles.seatBadge}>
      <MaterialIcons
        name="event-seat"
        size={scaleCard(18)}
        color="#FFFFFF"
      />
    </View>
  );
}

function InfoRow({
  icon,
  label,
  isTablet,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isTablet: boolean;
}) {
  if (!label) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons
        name={icon}
        size={scaleCard(isTablet ? 15 : 13)}
        color="#000000"
        style={styles.infoIcon}
      />
      <Text
        style={[styles.infoText, isTablet && styles.infoTextTablet]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}

export default function HomeEventCard({
  event,
  width: widthProp,
  isFeatured = false,
}: Props) {
  const router = useRouter();
  const isTablet = useIsTablet();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = widthProp ?? getHomeEventCardWidth(screenWidth, isTablet);
  const imageWidth = cardWidth - IMAGE_INSET * 2;
  const imageHeight = Math.round(imageWidth * IMAGE_HEIGHT_RATIO);
  const imageUrl =
    (isFeatured && event.featuredImageUrl) || event.imageUrl;
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

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/events/${event.id}`)}
      style={[styles.card, { width: cardWidth }]}
    >
      <View style={styles.imageOuter}>
        <View style={[styles.imageWrap, { height: imageHeight }]}>
          <EventCardImage
            imageUrl={imageUrl}
            cacheKey={eventImageCacheKey({ id: event.id, imageUrl })}
            recyclingKey={event.id}
            style={styles.image}
            contentFit="cover"
          />
          {event.startsAt ? (
            <View style={styles.dateBadgeWrap}>
              <EventDateBadge dateIso={event.startsAt} />
            </View>
          ) : null}
          {showSeatIcon ? (
            <View style={styles.seatBadgeWrap}>
              <SeatBadge />
            </View>
          ) : null}
          {cardBadge ? (
            <View style={styles.urgencyBadgeWrap}>
              <View
                style={[
                  styles.urgencyBadge,
                  {
                    backgroundColor: `#${cardBadge.backgroundColor || "C62828"}`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.urgencyBadgeText,
                    { color: `#${cardBadge.textColor || "FFFFFF"}` },
                  ]}
                  numberOfLines={1}
                >
                  {cardBadge.displayLabel}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.body, isTablet && styles.bodyTablet]}>
        <View
          style={[styles.titleWrap, isTablet && styles.titleWrapTablet]}
        >
          <Text
            style={[styles.title, isTablet && styles.titleTablet]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {event.title}
          </Text>
        </View>
        <View style={styles.titleDivider} />

        <View style={styles.infoList}>
          <InfoRow
            icon="location"
            label={formatVenueLine(event)}
            isTablet={isTablet}
          />
          <InfoRow
            icon="calendar"
            label={formatEventDateLong(event.startsAt)}
            isTablet={isTablet}
          />
          <InfoRow
            icon="time"
            label={formatEventTime(event.startsAt)}
            isTablet={isTablet}
          />
        </View>
      </View>

      <View style={styles.footer}>
        {priceInfo ? (
          <View style={styles.priceCol}>
            <Text style={styles.priceMain}>
              {formatPriceTl(priceInfo.minPrice)}
            </Text>
            {priceInfo.hasMultiple ? (
              <Text style={styles.priceSub}>
                {t("priceButtonFrom")}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={[styles.buyCol, !priceInfo && styles.buyColFull]}>
          <Text style={styles.buyText}>
            {t("buy").toLocaleUpperCase("tr-TR")}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function HomeEventCardSkeleton({ width }: { width: number }) {
  const imageWidth = width - IMAGE_INSET * 2;
  const imageHeight = Math.round(imageWidth * IMAGE_HEIGHT_RATIO);
  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.imageOuter}>
        <View
          style={[styles.imageWrap, styles.skeleton, { height: imageHeight }]}
        />
      </View>
      <View
        style={[
          styles.body,
          { gap: scaleCard(4), paddingBottom: scaleCard(10) },
        ]}
      >
        <View
          style={[
            styles.skeletonLine,
            { width: "92%", height: scaleCard(18) * 2 },
          ]}
        />
        <View
          style={[styles.skeletonLine, { width: "78%", height: scaleCard(10) }]}
        />
        <View
          style={[styles.skeletonLine, { width: "64%", height: scaleCard(10) }]}
        />
        <View
          style={[styles.skeletonLine, { width: "28%", height: scaleCard(10) }]}
        />
      </View>
      <View style={styles.footer}>
        <View style={[styles.priceCol, styles.skeleton]} />
        <View style={[styles.buyCol, { opacity: 0.5 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.cardBg,
    borderRadius: scaleCard(HOME_CARD_BORDER_RADIUS),
    overflow: "hidden",
  },
  imageOuter: {
    padding: IMAGE_INSET,
    paddingBottom: scaleCard(2),
  },
  imageWrap: {
    width: "100%",
    position: "relative",
    borderRadius: scaleCard(12),
    overflow: "hidden",
    backgroundColor: "#E8ECF0",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  dateBadgeWrap: {
    position: "absolute",
    top: DATE_BADGE.offset,
    left: DATE_BADGE.offset,
    zIndex: 2,
  },
  seatBadgeWrap: {
    position: "absolute",
    top: DATE_BADGE.offset,
    right: DATE_BADGE.offset,
    zIndex: 2,
  },
  seatBadge: {
    width: scaleCard(32),
    height: scaleCard(32),
    borderRadius: scaleCard(10),
    backgroundColor: AppColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  urgencyBadgeWrap: {
    position: "absolute",
    bottom: DATE_BADGE.offset,
    left: DATE_BADGE.offset,
    right: DATE_BADGE.offset,
    alignItems: "center",
    zIndex: 2,
  },
  urgencyBadge: {
    borderRadius: scaleCard(4),
    paddingHorizontal: scaleCard(8),
    paddingVertical: scaleCard(3),
    maxWidth: "100%",
  },
  urgencyBadgeText: {
    fontFamily: "PoppinsBold",
    fontSize: scaleCard(11),
    lineHeight: scaleCard(14),
  },
  dateBadge: {
    minWidth: DATE_BADGE.minWidth,
    minHeight: DATE_BADGE.minHeight,
    borderRadius: DATE_BADGE.borderRadius,
    backgroundColor: AppColors.navBg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: DATE_BADGE.paddingH,
    paddingVertical: DATE_BADGE.paddingV,
  },
  dateDay: {
    color: AppColors.navText,
    fontFamily: "PoppinsBold",
    fontSize: DATE_BADGE_DAY.fontSize,
    lineHeight: DATE_BADGE_DAY.lineHeight,
  },
  dateMonth: {
    color: AppColors.navText,
    fontFamily: "PoppinsBold",
    fontSize: DATE_BADGE_MONTH.fontSize,
    lineHeight: DATE_BADGE_MONTH.lineHeight,
    textTransform: "capitalize",
    marginTop: DATE_BADGE.monthMarginTop,
  },
  body: {
    paddingHorizontal: scaleCard(12),
    paddingTop: scaleCard(4),
    paddingBottom: scaleCard(10),
    gap: scaleCard(2),
  },
  bodyTablet: {
    paddingHorizontal: scaleCard(14),
    paddingTop: scaleCard(6),
    paddingBottom: scaleCard(12),
  },
  titleWrap: {
    height: scaleCard(18) * 2,
    justifyContent: "center",
  },
  titleWrapTablet: {
    height: scaleCard(20) * 2,
  },
  title: {
    color: "#000000",
    fontFamily: "PoppinsSemiBold",
    fontSize: scaleCard(14),
    lineHeight: scaleCard(18),
    marginTop: 0,
  },
  titleTablet: {
    fontSize: scaleCard(16),
    lineHeight: scaleCard(20),
  },
  titleDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(52, 61, 72, 0.12)",
    marginTop: scaleCard(6),
    marginBottom: scaleCard(2),
  },
  infoList: {
    marginTop: scaleCard(4),
    gap: scaleCard(3),
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleCard(6),
  },
  infoIcon: {
    width: scaleCard(14),
  },
  infoText: {
    flex: 1,
    color: "#000000",
    fontFamily: "PoppinsRegular",
    fontSize: scaleCard(12),
    lineHeight: scaleCard(16),
  },
  infoTextTablet: {
    fontSize: scaleCard(13),
    lineHeight: scaleCard(17),
  },
  skeleton: {
    backgroundColor: "#E8ECF0",
  },
  skeletonLine: {
    borderRadius: scaleCard(6),
    backgroundColor: "#E8ECF0",
  },
  footer: {
    flexDirection: "row",
    width: "100%",
    minHeight: scaleCard(48),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(52, 61, 72, 0.12)",
  },
  priceCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scaleCard(8),
    paddingVertical: scaleCard(8),
    backgroundColor: AppColors.cardBg,
  },
  buyCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.secondaryButton,
    paddingHorizontal: scaleCard(8),
    paddingVertical: scaleCard(8),
  },
  buyColFull: {
    flex: 1,
    width: "100%",
  },
  priceMain: {
    color: AppColors.accent,
    fontFamily: "PoppinsBold",
    fontSize: scaleCard(13),
    lineHeight: scaleCard(16),
    textAlign: "center",
  },
  priceSub: {
    color: AppColors.accent,
    fontFamily: "PoppinsMedium",
    fontSize: scaleCard(10),
    lineHeight: scaleCard(12),
    textAlign: "center",
    marginTop: scaleCard(1),
  },
  buyText: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: scaleCard(12),
    lineHeight: scaleCard(15),
    textAlign: "center",
  },
});
