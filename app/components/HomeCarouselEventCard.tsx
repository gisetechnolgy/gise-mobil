import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { AppColors } from "../../constants/colors";
import { formatVenueLine } from "../../lib/formatVenueLine";
import {
  EventItem,
  eventImageCacheKey,
  formatEventDateLong,
  formatEventTime,
} from "../../lib/events";
import { useIsTablet } from "../../lib/responsive";
import { EventCardImage } from "./_EventCardImage";
import { HOME_EVENT_CARD_SCALE } from "./HomeEventCard";
import { AppText as Text } from "@/components/ui/AppText";

type Props = {
  event: EventItem;
  width: number;
};

/** Fotoğraftaki orta yatay kart oranları */
const CARD_RADIUS = 20;
const IMAGE_INSET = 5;
const CONTENT_GAP = 12;
const BODY_PADDING_RIGHT = 12;
const IMAGE_SIZE_PHONE = 122;
const IMAGE_SIZE_TABLET = 150;

function scaleCard(value: number) {
  return Math.round(value * HOME_EVENT_CARD_SCALE);
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
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function HomeCarouselEventCard({
  event,
  width,
}: Props) {
  const router = useRouter();
  const isTablet = useIsTablet();
  const imageSize = isTablet ? IMAGE_SIZE_TABLET : IMAGE_SIZE_PHONE;
  const imageColHeight = imageSize + IMAGE_INSET * 2;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/events/${event.id}`)}
      style={[styles.card, { width }]}
    >
      <View style={styles.imageCol}>
        <View
          style={[
            styles.imageWrap,
            { width: imageSize, height: imageSize, borderRadius: CARD_RADIUS },
          ]}
        >
          <EventCardImage
            imageUrl={event.imageUrl}
            cacheKey={eventImageCacheKey(event)}
            recyclingKey={event.id}
            style={styles.image}
            contentFit="cover"
          />
        </View>
      </View>

      <View
        style={[
          styles.body,
          { minHeight: imageColHeight },
          isTablet && styles.bodyTablet,
        ]}
      >
        <Text
          style={[styles.title, isTablet && styles.titleTablet]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {event.title}
        </Text>
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
    </TouchableOpacity>
  );
}

export function HomeCarouselEventCardSkeleton({ width }: { width: number }) {
  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.imageCol}>
        <View
          style={[
            styles.skeleton,
            {
              width: IMAGE_SIZE_PHONE,
              height: IMAGE_SIZE_PHONE,
              borderRadius: CARD_RADIUS,
            },
          ]}
        />
      </View>
      <View style={[styles.body, { minHeight: IMAGE_SIZE_PHONE + IMAGE_INSET * 2, gap: 6 }]}>
        <View style={[styles.skeletonLine, { width: "92%", height: 14 }]} />
        <View style={[styles.skeletonLine, { width: "88%", height: 14 }]} />
        <View style={[styles.skeletonLine, { width: "78%", height: 11 }]} />
        <View style={[styles.skeletonLine, { width: "64%", height: 11 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: AppColors.cardBg,
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
  },
  imageCol: {
    paddingTop: IMAGE_INSET,
    paddingLeft: IMAGE_INSET,
    paddingBottom: IMAGE_INSET,
    alignSelf: "flex-start",
  },
  imageWrap: {
    overflow: "hidden",
    backgroundColor: "#E8ECF0",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  body: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    marginLeft: CONTENT_GAP,
    paddingRight: BODY_PADDING_RIGHT,
    gap: scaleCard(2),
  },
  bodyTablet: {
    paddingRight: scaleCard(14),
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
    borderRadius: 6,
    backgroundColor: "#E8ECF0",
  },
});
