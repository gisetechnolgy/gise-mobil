import { useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { AppColors } from "../../../constants/colors";
import { LIST_CARD } from "../../../constants/homeSectionList";
import {
  EventItem,
  eventImageCacheKey,
  formatEventDateLong,
  formatEventTime,
} from "../../../lib/events";
import {
  formatPriceRangeLabel,
  type ActivePriceInfo,
} from "../../../lib/startingPrice";
import { useTranslation } from "../../context/_LocaleContext";
import { formatCityLabel } from "../../../lib/cities";
import { EventCardImage } from "../_EventCardImage";
import { AppText as Text } from "@/components/ui/AppText";

/** Fiyat + Satın Al aynı satır yüksekliği → dikeyde aynı hiza */
const FOOTER_LINE_HEIGHT = Math.round(
  Math.max(LIST_CARD.priceSize, LIST_CARD.buySize) * 1.3,
);

type Props = {
  event: EventItem & {
    bannerCardUrl?: string | null;
    featuredImageUrl?: string | null;
    priceInfo?: ActivePriceInfo | null;
  };
  isFeatured?: boolean;
  href?: import("expo-router").Href;
  /** Verilirse varsayılan navigasyon yerine bu çağrılır */
  onPress?: () => void;
  /** Yatay carousel slot genişliği */
  width?: number;
};

export default function HomeEventHorizontalCard({
  event,
  isFeatured = false,
  href,
  onPress,
  width,
}: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const dateLabel = formatEventDateLong(event.startsAt);
  const timeLabel = formatEventTime(event.startsAt);
  const dateTime = timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel;
  const venueLabel = [event.venueName?.trim(), formatCityLabel(event.city)]
    .filter(Boolean)
    .join(", ");
  const priceLabel = formatPriceRangeLabel(event.priceInfo, t("freeOfCharge"));
  /** Web design2: featured → banner → bannerCard */
  const imageUrl =
    (isFeatured && event.featuredImageUrl) ||
    event.imageUrl ||
    event.bannerCardUrl ||
    null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        if (onPress) {
          onPress();
          return;
        }
        router.push(href ?? (`/events/${event.id}` as import("expo-router").Href));
      }}
      style={[
        styles.card,
        {
          height: LIST_CARD.height,
          borderRadius: LIST_CARD.radius,
          ...(width != null ? { width } : null),
        },
      ]}
    >
      <View
        style={[
          styles.thumb,
          {
            width: LIST_CARD.imageWidth,
            borderTopLeftRadius: LIST_CARD.radius,
            borderBottomLeftRadius: LIST_CARD.radius,
          },
        ]}
      >
        <EventCardImage
          imageUrl={imageUrl}
          cacheKey={eventImageCacheKey({
            id: event.id,
            imageUrl: imageUrl ?? event.imageUrl,
          })}
          recyclingKey={`h-${event.id}`}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      </View>
      <View
        style={[
          styles.content,
          {
            paddingHorizontal: LIST_CARD.textPad,
            paddingVertical: LIST_CARD.textPadY,
            gap: LIST_CARD.lineGap,
          },
        ]}
      >
        <Text
          style={[styles.title, { fontSize: LIST_CARD.titleSize }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {event.title}
        </Text>
        {dateTime ? (
          <Text
            style={[styles.meta, { fontSize: LIST_CARD.metaSize }]}
            numberOfLines={1}
          >
            {dateTime}
          </Text>
        ) : null}
        {venueLabel ? (
          <Text
            style={[styles.meta, { fontSize: LIST_CARD.metaSize }]}
            numberOfLines={1}
          >
            {venueLabel}
          </Text>
        ) : null}
        <View style={styles.footer}>
          {priceLabel ? (
            <View style={styles.priceLine}>
              <View style={styles.pricePill}>
                <Text
                  style={[
                    styles.price,
                    {
                      fontSize: LIST_CARD.priceSize,
                      lineHeight: FOOTER_LINE_HEIGHT,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {priceLabel}
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <View style={styles.buyBox}>
            <Text
              style={[
                styles.buy,
                {
                  fontSize: LIST_CARD.buySize,
                  lineHeight: FOOTER_LINE_HEIGHT,
                },
              ]}
              numberOfLines={1}
            >
              {t("buy")}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
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
  thumb: {
    height: "100%",
    backgroundColor: "#E5E7EB",
    flexShrink: 0,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    minWidth: 0,
    justifyContent: "flex-start",
  },
  title: {
    fontFamily: "PoppinsBold",
    color: AppColors.heading,
    lineHeight: 16,
  },
  meta: {
    fontFamily: "PoppinsRegular",
    color: "#808080",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: "auto",
  },
  priceLine: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    alignItems: "flex-start",
  },
  pricePill: {
    maxWidth: "100%",
    backgroundColor: "#e6e6e6",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  price: {
    fontFamily: "PoppinsBold",
    color: AppColors.heading,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  /** pricePill ile aynı dikey padding → iki kutu aynı yükseklikte */
  buyBox: {
    flexShrink: 0,
    paddingVertical: 5,
    justifyContent: "center",
  },
  buy: {
    fontFamily: "PoppinsBold",
    color: AppColors.accent,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
