import { LinearGradient } from "expo-linear-gradient";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  CAROUSEL_BG_PRIMARY,
  getMobileHeroCardWidth,
  HERO_GRADIENT_EDGE,
  HERO_GRADIENT_MID,
  MOBILE_HERO_GAP,
  MOBILE_HERO_SECTION_PADDING,
  MOBILE_HERO_SIDE_PADDING,
} from "../../constants/heroFeatured";
import {
  fetchHeroFeatured,
  type HeroFeaturedEvent,
} from "../../lib/heroFeatured";
import type {
  SectionLoadingProps,
  SectionReloadHandle,
} from "../../lib/sectionReload";
import { prefetchEventImages } from "./_EventCardImage";
import HeroFeaturedEventCard from "./HeroFeaturedEventCard";

const FeaturedEventsHero = forwardRef<SectionReloadHandle, SectionLoadingProps>(
  function FeaturedEventsHero({ onLoadingChange }, ref) {
    const { width: screenWidth } = useWindowDimensions();
    const viewportW = Math.max(0, screenWidth - MOBILE_HERO_SIDE_PADDING);
    const cardWidth = getMobileHeroCardWidth(viewportW);
    const [events, setEvents] = useState<HeroFeaturedEvent[]>([]);
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (options?: { silent?: boolean; refresh?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      try {
        const data = await fetchHeroFeatured({ refresh: options?.refresh });
        setEvents(data.events);
        setBannerUrl(data.bannerUrl);
        void prefetchEventImages(data.events);
      } catch {
        setEvents([]);
        setBannerUrl(null);
      } finally {
        if (!silent) setLoading(false);
      }
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        reload: (opts) => load({ silent: true, refresh: opts?.refresh }),
      }),
      [load],
    );

    useEffect(() => {
      void load();
    }, [load]);

    useEffect(() => {
      onLoadingChange?.(loading);
    }, [loading, onLoadingChange]);

    if (!loading && events.length === 0) return null;

    const content = (
      <View
        style={{
          paddingTop: MOBILE_HERO_SECTION_PADDING,
          paddingBottom: MOBILE_HERO_SECTION_PADDING,
        }}
      >
        {loading ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingLeft: MOBILE_HERO_SIDE_PADDING,
              paddingRight: 0,
              gap: MOBILE_HERO_GAP,
            }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <View
                key={`hero-skel-${i}`}
                style={{
                  width: cardWidth,
                  height: Math.round((344 / 275) * cardWidth) + 20,
                  borderRadius: Math.round(16 * (cardWidth / 275)),
                  backgroundColor: "rgba(255,255,255,0.12)",
                }}
              />
            ))}
          </ScrollView>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            contentContainerStyle={{
              paddingLeft: MOBILE_HERO_SIDE_PADDING,
              paddingRight: 0,
              gap: MOBILE_HERO_GAP,
              // buy button overflow
              paddingBottom: 4,
              paddingTop: 4,
            }}
          >
            {events.map((event, index) => (
              <HeroFeaturedEventCard
                key={`${event.id}-${index}`}
                event={event}
                width={cardWidth}
              />
            ))}
          </ScrollView>
        )}
      </View>
    );

    if (bannerUrl) {
      return (
        <ImageBackground
          source={{ uri: bannerUrl }}
          style={styles.section}
          imageStyle={{ opacity: 1 }}
        >
          <View style={styles.bannerOverlay} />
          <LinearGradient
            colors={[
              HERO_GRADIENT_EDGE,
              HERO_GRADIENT_MID,
              CAROUSEL_BG_PRIMARY,
              HERO_GRADIENT_MID,
              HERO_GRADIENT_EDGE,
            ]}
            locations={[0, 0.2, 0.5, 0.8, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFill, { opacity: 0.55 }]}
          />
          {content}
        </ImageBackground>
      );
    }

    return (
      <LinearGradient
        colors={[
          HERO_GRADIENT_EDGE,
          HERO_GRADIENT_MID,
          CAROUSEL_BG_PRIMARY,
          HERO_GRADIENT_MID,
          HERO_GRADIENT_EDGE,
        ]}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.section}
      >
        {content}
      </LinearGradient>
    );
  },
);

export default FeaturedEventsHero;

const styles = StyleSheet.create({
  section: {
    width: "100%",
    backgroundColor: HERO_GRADIENT_EDGE,
    overflow: "visible",
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(18, 18, 41, 0.72)",
  },
});
