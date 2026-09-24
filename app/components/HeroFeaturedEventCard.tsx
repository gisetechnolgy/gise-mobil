import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from "react-native";
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
import { formatHomePriceAmount } from "../../lib/startingPrice";
import { useTranslation } from "../context/_LocaleContext";
import { EventCardImage } from "./_EventCardImage";
import { AppText as Text } from "@/components/ui/AppText";

type Props = {
  event: HeroFeaturedEvent;
  width?: number;
};

/** Fiyat + suffix: tek satırda kalırsa yan yana; kırılırsa satırlar arası 1px */
function HeroPriceLabel({
  amount,
  suffix,
  priceSize,
  suffixSize,
}: {
  amount: string;
  suffix: string;
  priceSize: number;
  suffixSize: number;
}) {
  const [wrapLines, setWrapLines] = useState<string[] | null>(null);
  const measuredKey = useRef("");
  const key = `${amount}|${suffix}|${priceSize}|${suffixSize}`;

  useEffect(() => {
    measuredKey.current = "";
    setWrapLines(null);
  }, [key]);

  const priceStyle = useMemo(
    () =>
      ({
        color: AppColors.accent,
        fontFamily: "PoppinsBold" as const,
        fontSize: priceSize,
        lineHeight: priceSize + 2,
      }) as const,
    [priceSize],
  );

  const suffixStyle = useMemo(
    () =>
      ({
        color: "rgba(255,255,255,0.94)",
        fontFamily: "PoppinsRegular" as const,
        fontSize: suffixSize,
        lineHeight: suffixSize + 2,
      }) as const,
    [suffixSize],
  );

  const onTextLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (measuredKey.current === key) return;
    measuredKey.current = key;
    const lines = e.nativeEvent.lines.map((l) => l.text);
    if (lines.length > 1) setWrapLines(lines);
  };

  const renderLine = (lineText: string, isFirst: boolean) => {
    if (!isFirst) {
      return <Text style={suffixStyle}>{lineText}</Text>;
    }
    const idx = lineText.indexOf(amount);
    if (idx < 0) {
      return <Text style={suffixStyle}>{lineText}</Text>;
    }
    const before = lineText.slice(0, idx);
    const after = lineText.slice(idx + amount.length);
    return (
      <Text style={suffixStyle}>
        {before ? <Text style={suffixStyle}>{before}</Text> : null}
        <Text style={priceStyle}>{amount}</Text>
        {after ? <Text style={suffixStyle}>{after}</Text> : null}
      </Text>
    );
  };

  if (wrapLines && wrapLines.length > 1) {
    return (
      <View style={{ gap: 1 }}>
        {wrapLines.map((lineText, idx) => (
          <View key={`price-line-${idx}`}>
            {renderLine(lineText, idx === 0)}
          </View>
        ))}
      </View>
    );
  }

  return (
    <Text
      onTextLayout={onTextLayout}
      style={{ lineHeight: priceSize + 2 }}
    >
      <Text style={priceStyle}>{amount}</Text>
      <Text style={suffixStyle}>{` ${suffix}`}</Text>
    </Text>
  );
}

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
  const metaSize = COMPACT.metaSize;
  const priceSize = COMPACT.priceSize;
  const priceSuffixSize = COMPACT.priceSuffixSize;
  const lineGap = COMPACT.textLineGap;
  const metaLineHeight = Math.round(metaSize * 1.25);
  const titleLineHeight = Math.round(titleSize * 1.25);

  const imageUrl = event.featuredImageUrl || event.imageUrl;
  const dateLabel = formatEventDateLong(event.startsAt);
  const timeLabel = formatEventTime(event.startsAt);
  const dateLine = timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel;
  const venueLabel = event.venueName?.trim() || "";
  const priceInfo = event.priceInfo;
  const priceAmount = priceInfo
    ? formatHomePriceAmount(priceInfo.minPrice)
    : "";

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
            {priceInfo ? (
              <HeroPriceLabel
                amount={priceAmount}
                suffix={t("heroPriceFromSuffix")}
                priceSize={priceSize}
                suffixSize={priceSuffixSize}
              />
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
