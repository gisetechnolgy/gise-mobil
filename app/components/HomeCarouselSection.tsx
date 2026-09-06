import { useMemo, useState } from "react";
import {
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  formatHomeSectionTitle,
  homeCarouselTitleStyle,
} from "../../constants/homeTypography";
import {
  resolveCarouselBgColor,
  type HomeSection,
} from "../../lib/homeSections";
import { resolveRemoteImageUrl } from "../../lib/remoteImage";
import { useIsTablet } from "../../lib/responsive";
import HomeCarouselEventCard from "./HomeCarouselEventCard";
import { AppText as Text } from "@/components/ui/AppText";

type Props = {
  section: HomeSection;
};

const H_PADDING = 20;
const CARD_GAP = 14;

export default function HomeCarouselSection({
  section,
}: Props) {
  const isTablet = useIsTablet();
  const { width: screenWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const cardWidth = screenWidth - H_PADDING * 2;
  const snapInterval = cardWidth + CARD_GAP;
  const bannerUri = resolveRemoteImageUrl(section.bannerUrl, section.id);
  const hasBanner = Boolean(bannerUri);
  const solidBgColor = resolveCarouselBgColor(section.carouselBgColor);

  // Paneldeki sıra korunmalı: event1..event8 seçimi ekranda aynı sırayla gelmeli.
  const events = useMemo(() => section.events, [section.events]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / snapInterval);
    setActiveIndex(Math.max(0, Math.min(index, events.length - 1)));
  };

  const content = (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={homeCarouselTitleStyle(isTablet)}>
          {formatHomeSectionTitle(section.title)}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snapInterval}
        snapToAlignment="start"
        contentContainerStyle={styles.listContent}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
      >
        {events.map((event, index) => (
          <HomeCarouselEventCard
            key={`${section.id}-${event.id}-${index}`}
            event={event}
            width={cardWidth}
          />
        ))}
      </ScrollView>

      {events.length > 1 ? (
        <View style={styles.dots}>
          {events.map((event, index) => (
            <View
              key={`${section.id}-dot-${event.id}-${index}`}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.wrap}>
      {hasBanner ? (
        <ImageBackground
          source={{ uri: bannerUri! }}
          style={[styles.background, { backgroundColor: solidBgColor }]}
          imageStyle={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.overlay} />
          {content}
        </ImageBackground>
      ) : (
        <View style={[styles.background, { backgroundColor: solidBgColor }]}>
          {content}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
  },
  background: {
    paddingTop: 14,
    paddingBottom: 16,
  },
  backgroundImage: {
    opacity: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  content: {
    position: "relative",
  },
  header: {
    paddingHorizontal: H_PADDING,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: H_PADDING,
    gap: CARD_GAP,
    paddingBottom: 2,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: H_PADDING,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
    width: 8,
    height: 8,
  },
});
