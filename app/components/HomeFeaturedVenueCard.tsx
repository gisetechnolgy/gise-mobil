import { useRouter } from "expo-router";
import {
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { AppColors } from "../../constants/colors";
import { HOME_CARD_BORDER_RADIUS, useIsTablet } from "../../lib/responsive";
import type { VenueItem } from "../../lib/venues";
import { EventCardImage } from "./EventCardImage";
import { HOME_EVENT_CARD_SCALE } from "./HomeEventCard";
import { AppText as Text } from "@/components/ui/AppText";

/** Event card’dan küçük ana sayfa mekan kartı (buton yok). */
export const HOME_FEATURED_VENUE_CARD_SCALE = 0.8;

function scaleCard(value: number) {
  return Math.round(value * HOME_FEATURED_VENUE_CARD_SCALE);
}

/** Title tipografisi event card ile birebir (ölçek/renk/bold). */
function scaleEventTitle(value: number) {
  return Math.round(value * HOME_EVENT_CARD_SCALE);
}

export function getHomeFeaturedVenueCardWidth(
  screenWidth: number,
  isTablet: boolean,
) {
  const base = Math.round(screenWidth * (isTablet ? 0.22 : 0.42));
  return scaleCard(base);
}

const IMAGE_INSET = scaleCard(6);
const IMAGE_HEIGHT_RATIO = 1;

type Props = {
  venue: VenueItem;
  width?: number;
};

export default function HomeFeaturedVenueCard({ venue, width: widthProp }: Props) {
  const router = useRouter();
  const isTablet = useIsTablet();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth =
    widthProp ?? getHomeFeaturedVenueCardWidth(screenWidth, isTablet);
  const imageWidth = cardWidth - IMAGE_INSET * 2;
  const imageHeight = Math.round(imageWidth * IMAGE_HEIGHT_RATIO);
  const imageUrl = venue.logoUrl || venue.bannerUrl;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() =>
        router.push(`/venues/${venue.id}` as import("expo-router").Href)
      }
      style={[styles.card, { width: cardWidth }]}
    >
      <View style={styles.imageOuter}>
        <View style={[styles.imageWrap, { height: imageHeight }]}>
          <EventCardImage
            imageUrl={imageUrl}
            cacheKey={imageUrl ?? venue.id}
            recyclingKey={venue.id}
            style={styles.image}
            contentFit="cover"
          />
        </View>
      </View>

      <View style={[styles.body, isTablet && styles.bodyTablet]}>
        <Text
          style={[styles.title, isTablet && styles.titleTablet]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {venue.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function HomeFeaturedVenueCardSkeleton({ width }: { width: number }) {
  const imageWidth = width - IMAGE_INSET * 2;
  const imageHeight = Math.round(imageWidth * IMAGE_HEIGHT_RATIO);
  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.imageOuter}>
        <View
          style={[styles.imageWrap, styles.skeleton, { height: imageHeight }]}
        />
      </View>
      <View style={styles.body}>
        <View
          style={[styles.skeletonLine, { width: "88%", height: scaleCard(14) }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.cardBg,
    borderRadius: scaleCard(HOME_CARD_BORDER_RADIUS),
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
  body: {
    paddingHorizontal: scaleCard(10),
    paddingTop: scaleCard(6),
    paddingBottom: scaleCard(12),
    minHeight: scaleCard(32),
    justifyContent: "center",
  },
  bodyTablet: {
    paddingHorizontal: scaleCard(12),
    paddingBottom: scaleCard(14),
  },
  title: {
    color: "#000000",
    fontFamily: "PoppinsSemiBold",
    fontSize: scaleEventTitle(14),
    lineHeight: scaleEventTitle(18),
    marginTop: 0,
    textAlign: "center",
  },
  titleTablet: {
    fontSize: scaleEventTitle(16),
    lineHeight: scaleEventTitle(20),
  },
  skeleton: {
    backgroundColor: "rgba(52, 61, 72, 0.08)",
  },
  skeletonLine: {
    borderRadius: 4,
    backgroundColor: "rgba(52, 61, 72, 0.08)",
  },
});
