import { useRouter } from "expo-router";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import {
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { homeSectionTitleStyle, formatHomeSectionTitle, homeSeeAllStyle } from "../../constants/homeTypography";
import { EventItem } from "../../lib/events";
import { fetchHomeSections, type HomeSection } from "../../lib/homeSections";
import type {
  SectionLoadingProps,
  SectionReloadHandle,
} from "../../lib/sectionReload";
import { useIsTablet } from "../../lib/responsive";
import { prefetchEventImages } from "./EventCardImage";
import EventsSection from "./EventsSection";
import HomeCarouselSection from "./HomeCarouselSection";
import HomeEventsMarquee from "./HomeEventsMarquee";
import { AppText as Text } from "@/components/ui/AppText";
import HomeEventCard, {
  getHomeEventCardWidth,
  HomeEventCardSkeleton,
} from "./HomeEventCard";

const HomeSections = forwardRef<SectionReloadHandle, SectionLoadingProps>(
  function HomeSections({ onLoadingChange }, ref) {
    const router = useRouter();
    const isTablet = useIsTablet();
    const { width: screenWidth } = useWindowDimensions();
    const cardWidth = getHomeEventCardWidth(screenWidth, isTablet);
    const [sections, setSections] = useState<HomeSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [useFallback, setUseFallback] = useState(false);
    const [fallbackLoading, setFallbackLoading] = useState(true);

    const load = useCallback(async (options?: { silent?: boolean; refresh?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      try {
        const data = await fetchHomeSections();
        if (data.length === 0) {
          setUseFallback(true);
          setSections([]);
        } else {
          setUseFallback(false);
          setSections(data);
          void prefetchEventImages(data.flatMap((s) => s.events));
        }
      } catch {
        setUseFallback(true);
        setSections([]);
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
      onLoadingChange?.(useFallback ? fallbackLoading : loading);
    }, [useFallback, fallbackLoading, loading, onLoadingChange]);

    if (useFallback) {
      return <EventsSection onLoadingChange={setFallbackLoading} />;
    }

    if (loading) {
      return (
        <View className="mt-4">
          <View className="px-5 mb-2">
            <View className="h-5 w-40 rounded bg-[#E8ECF0]" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
          >
            {Array.from({ length: 2 }).map((_, idx) => (
              <HomeEventCardSkeleton
                key={`home-section-skel-${idx}`}
                width={cardWidth}
              />
            ))}
          </ScrollView>
        </View>
      );
    }

    const cardGap = isTablet ? 18 : 14;

    return (
      <View className="mt-2">
        {sections.map((section) =>
          section.isCarousel ? (
            <HomeCarouselSection
              key={section.id}
              section={section}
            />
          ) : (
            <View key={section.id} className="mt-4">
              <View className="flex-row items-center justify-between px-5 mb-2">
                <Text style={homeSectionTitleStyle(isTablet)}>
                  {formatHomeSectionTitle(section.title)}
                </Text>
                {section.seeAllVenueId ? (
                  <TouchableOpacity
                    onPress={() =>
                      router.push(
                        `/venues/${section.seeAllVenueId}` as import("expo-router").Href,
                      )
                    }
                  >
                    <Text style={homeSeeAllStyle(isTablet)}>
                      Tümünü Göster
                    </Text>
                  </TouchableOpacity>
                ) : section.seeAllCategory ? (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/events",
                        params: { category: section.seeAllCategory! },
                      })
                    }
                  >
                    <Text style={homeSeeAllStyle(isTablet)}>
                      Tümünü Göster
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => router.push("/(tabs)/events")}>
                    <Text style={homeSeeAllStyle(isTablet)}>
                      Tümünü Göster
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {section.marquee && section.events.length > 4 ? (
                <HomeEventsMarquee
                  sectionId={section.id}
                  events={section.events}
                  cardWidth={cardWidth}
                  gap={cardGap}
                  isFeatured={section.isFeatured}
                />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingTop: 4,
                    paddingBottom: 10,
                    gap: cardGap,
                  }}
                >
                  {section.events.map((event: EventItem, index) => (
                    <HomeEventCard
                      key={`${section.id}-${event.id}-${index}`}
                      event={event}
                      width={cardWidth}
                      isFeatured={section.isFeatured}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          ),
        )}
      </View>
    );
  },
);

export default HomeSections;
