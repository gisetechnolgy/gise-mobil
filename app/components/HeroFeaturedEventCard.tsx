import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { AppColors } from "../../constants/colors";
import { COMPACT } from "../../constants/homeSection";
import {
  HERO_BUY_BUTTON_FONT_SIZE,
  HERO_BUY_BUTTON_HEIGHT,
  HERO_BUY_BUTTON_SIDE_INSET,
  HERO_CARD_BUY_BOX_SHADOW,
  HERO_CARD_BOX_SHADOW,
  HERO_CARD_GRADIENT_COLOR,
  HERO_CARD_HEIGHT,
  HERO_CARD_META_COLOR,
  HERO_CARD_TEXT_INSET,
  HERO_CARD_WIDTH,
  MOBILE_HERO_CARD_WIDTH_FALLBACK,
} from "../../constants/heroFeatured";
import {
  formatEventDateLong,
  formatEventTime,
  eventImageCacheKey,
} from "../../lib/events";
import type { HeroFeaturedEvent } from "../../lib/heroFeatured";
import { formatPriceRangeLabel } from "../../lib/startingPrice";
import { CARD_META_SIZE, CARD_PRICE_SIZE } from "./HomeEventCard";
import { useTranslation } from "../context/_LocaleContext";
import { EventCardImage } from "./_EventCardImage";
import { AppText as Text } from "@/components/ui/AppText";

type Props = {
  event: HeroFeaturedEvent;
  width?: number;
};

export default function HeroFeaturedEventCard({
  event,
  width: widthProp,
}: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const measuredWidth = widthProp ?? MOBILE_HERO_CARD_WIDTH_FALLBACK;
  const layoutScale = measuredWidth / HERO_CARD_WIDTH;
  const typeScale = Math.min(layoutScale, 1);
  const w = Math.round(HERO_CARD_WIDTH * layoutScale);
  const h = Math.round(HERO_CARD_HEIGHT * layoutScale);
  const buyH = Math.round(HERO_BUY_BUTTON_HEIGHT * typeScale);
  const buyOverflow = Math.ceil(buyH / 2);
  const slotH = h + buyOverflow * 2;
  const textInset = Math.round(HERO_CARD_TEXT_INSET * typeScale);
  const buySideInset = Math.round(HERO_BUY_BUTTON_SIDE_INSET * typeScale);
  const radius = Math.round(16 * layoutScale);
  const buyRadius = Math.round(12 * typeScale);
  const overlayPadTop = Math.round(72 * typeScale);
  /** Sadece Satın Al — kart üstü overlay yazılara dokunma */
  const buyFontSize = Math.max(
    12,
    Math.round(HERO_BUY_BUTTON_FONT_SIZE * typeScale),
  );

  /** Kart üstü: başlık + tarih/mekan + fiyat = event kart boyutları */
  const titleSize = COMPACT.titleSize;
  const metaSize = CARD_META_SIZE;
  const priceSize = CARD_PRICE_SIZE;
  const lineGap = COMPACT.textLineGap;
  const metaLineHeight = Math.round(metaSize * 1.25);
  const titleLineHeight = Math.round(titleSize * 1.25);

  const imageUrl = event.featuredImageUrl || event.imageUrl;
  const dateLabel = formatEventDateLong(event.startsAt);
  const timeLabel = formatEventTime(event.startsAt);
  const dateLine = timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel;
  const venueLabel = event.venueName?.trim() || "";
  const priceLabel = formatPriceRangeLabel(event.priceInfo, t("freeOfCharge"));

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => router.push(`/events/${event.id}`)}
      style={{ width: w, height: slotH }}
    >
      <View style={{ width: w, height: h + buyOverflow, position: "relative" }}>
        <View
          style={[
            styles.cover,
            HERO_CARD_BOX_SHADOW,
            {
              width: w,
              height: h,
              borderRadius: radius,
            },
          ]}
        >
          <EventCardImage
            imageUrl={imageUrl}
            cacheKey={eventImageCacheKey({ id: event.id, imageUrl })}
            recyclingKey={`hero-${event.id}`}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <LinearGradient
            colors={["transparent", "transparent", HERO_CARD_GRADIENT_COLOR]}
            locations={[0, 0.3, 0.9]}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={{
              position: "absolute",
              left: textInset,
              right: textInset,
              // Alt boşluk = sol boşluk (textInset)
              bottom: textInset,
              top: overlayPadTop,
              justifyContent: "flex-end",
              gap: lineGap,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: "PoppinsBold",
                fontSize: titleSize,
                lineHeight: titleLineHeight,
              }}
              numberOfLines={2}
            >
              {event.title}
            </Text>
            {dateLine ? (
              <Text
                style={{
                  color: HERO_CARD_META_COLOR,
                  fontFamily: "PoppinsRegular",
                  fontSize: metaSize,
                  lineHeight: metaLineHeight,
                }}
                numberOfLines={1}
              >
                {dateLine}
              </Text>
            ) : null}
            {venueLabel ? (
              <Text
                style={{
                  color: HERO_CARD_META_COLOR,
                  fontFamily: "PoppinsRegular",
                  fontSize: metaSize,
                  lineHeight: metaLineHeight,
                }}
                numberOfLines={1}
              >
                {venueLabel}
              </Text>
            ) : null}
            {priceLabel ? (
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: "PoppinsBold",
                  fontSize: priceSize,
                  lineHeight: priceSize + 2,
                }}
                numberOfLines={1}
              >
                {priceLabel}
              </Text>
            ) : null}
          </View>
        </View>

        <View
          style={[
            styles.buyBtn,
            HERO_CARD_BUY_BOX_SHADOW,
            {
              height: buyH,
              left: buySideInset,
              right: buySideInset,
              bottom: -buyOverflow,
              borderBottomLeftRadius: buyRadius,
              borderBottomRightRadius: buyRadius,
            },
          ]}
        >
          <Text
            style={{
              fontFamily: "PoppinsBold",
              fontSize: buyFontSize,
              color: "#111111",
            }}
          >
            {t("buy")}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cover: {
    backgroundColor: "#1A1A1A",
    overflow: "hidden",
  },
  buyBtn: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
});
