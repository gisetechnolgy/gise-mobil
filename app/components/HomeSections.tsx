import { Ionicons } from "@expo/vector-icons";
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
  View,
} from "react-native";
import {
  HOME_SECTION_CARD_GAP,
  HOME_SECTION_FOOTER_GAP,
  MOBILE_HOME_SECTION_GAP_BETWEEN,
  MOBILE_HOME_SECTION_HEADER_GAP,
  PAGE_GUTTER,
  SECTION_BG,
} from "../../constants/homeSection";
import {
  formatHomeSectionTitle,
  getHomeSectionChrome,
  homeSectionTitleStyle,
  homeSeeAllButtonStyle,
  homeSeeAllStyle,
} from "../../constants/homeTypography";
import { EventItem } from "../../lib/events";
import { fetchHomeSections, type HomeSection } from "../../lib/homeSections";
import type {
  SectionLoadingProps,
  SectionReloadHandle,
} from "../../lib/sectionReload";
import { useIsTablet } from "../../lib/responsive";
import { useTranslation } from "../context/_LocaleContext";
import { prefetchEventImages } from "./_EventCardImage";
import EventsSection from "./EventsSection";
import HomeCarouselSection from "./HomeCarouselSection";
import HomeEventsMarquee from "./HomeEventsMarquee";
import HomeEventHorizontalCard from "./detail/HomeEventHorizontalCard";
import HomeSectionViewToggle, {
  type HomeViewMode,
} from "./HomeSectionViewToggle";
import { getListSlideWidth } from "../../constants/homeSectionList";
import { AppText as Text } from "@/components/ui/AppText";
import HomeEventCard, {
  getHomeEventCardWidth,
  HomeEventCardSkeleton,
} from "./HomeEventCard";

function chunkPairs<T>(items: T[]): T[][] {
  const pairs: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push(items.slice(i, i + 2));
  }
  return pairs;
}

const HomeSections = forwardRef<SectionReloadHandle, SectionLoadingProps>(
  function HomeSections({ onLoadingChange }, ref) {
    const router = useRouter();
    const { t } = useTranslation();
    const isTablet = useIsTablet();
    const { width: screenWidth } = useWindowDimensions();
    const chrome = getHomeSectionChrome(screenWidth);
    const cardWidth = getHomeEventCardWidth(screenWidth, isTablet);
    const [sections, setSections] = useState<HomeSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [useFallback, setUseFallback] = useState(false);
    const [fallbackLoading, setFallbackLoading] = useState(true);
    /** Mobil varsayılan: 1. tasarım (büyük / grid) */
    const [viewModes, setViewModes] = useState<Record<string, HomeViewMode>>(
      {},
    );

    const getViewMode = (sectionId: string): HomeViewMode =>
      viewModes[sectionId] ?? "grid";

    const setViewMode = (sectionId: string, mode: HomeViewMode) => {
      setViewModes((prev) => ({ ...prev, [sectionId]: mode }));
    };

    const load = useCallback(
      async (options?: { silent?: boolean; refresh?: boolean }) => {
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
      },
      [],
    );

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
      return (
        <View
          style={{
            backgroundColor: SECTION_BG,
            paddingBottom: HOME_SECTION_FOOTER_GAP,
          }}
        >
          <EventsSection onLoadingChange={setFallbackLoading} />
        </View>
      );
    }

    if (loading) {
      return (
        <View style={{ backgroundColor: SECTION_BG, paddingTop: 20 }}>
          <View
            style={{
              paddingHorizontal: PAGE_GUTTER,
              marginBottom: MOBILE_HOME_SECTION_HEADER_GAP,
            }}
          >
            <View
              style={{
                height: 14,
                width: 140,
                borderRadius: 4,
                backgroundColor: "#D8DDE3",
              }}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: PAGE_GUTTER,
              gap: HOME_SECTION_CARD_GAP,
              paddingTop: 4,
              paddingBottom: 4,
            }}
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

    return (
      <View
        style={{
          backgroundColor: SECTION_BG,
          paddingBottom: HOME_SECTION_FOOTER_GAP,
        }}
      >
        {sections.map((section, index) =>
          section.isCarousel ? (
            <HomeCarouselSection key={section.id} section={section} />
          ) : (
            <View
              key={section.id}
              style={{
                paddingTop: index === 0 ? 0 : MOBILE_HOME_SECTION_GAP_BETWEEN,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: PAGE_GUTTER,
                  paddingTop: index === 0 ? 20 : 0,
                  marginBottom: MOBILE_HOME_SECTION_HEADER_GAP,
                  minHeight: 28,
                  gap: 8,
                }}
              >
                <Text
                  style={[homeSectionTitleStyle(isTablet), { flex: 1, minWidth: 0, paddingRight: 8 }]}
                  numberOfLines={1}
                >
                  {formatHomeSectionTitle(section.title)}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexShrink: 0,
                    gap: 6,
                    minHeight: chrome.height,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      if (section.seeAllVenueId) {
                        router.push(
                          `/venues/${section.seeAllVenueId}` as import("expo-router").Href,
                        );
                      } else if (section.seeAllCategory) {
                        router.push({
                          pathname: "/(tabs)/events",
                          params: { category: section.seeAllCategory },
                        });
                      } else {
                        router.push("/(tabs)/events");
                      }
                    }}
                    style={homeSeeAllButtonStyle(screenWidth)}
                    activeOpacity={0.85}
                  >
                    <Text style={homeSeeAllStyle(screenWidth)}>{t("showAll")}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={chrome.seeAllChevron}
                      color="#FFFFFF"
                      style={{ marginLeft: 3 }}
                    />
                  </TouchableOpacity>
                  <HomeSectionViewToggle
                    view={getViewMode(section.id)}
                    onChange={(mode) => setViewMode(section.id, mode)}
                  />
                </View>
              </View>

              {getViewMode(section.id) === "list" ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: PAGE_GUTTER,
                    paddingTop: 4,
                    paddingBottom: 4,
                    gap: 10,
                  }}
                >
                  {chunkPairs(section.events).map((pair, pairIndex) => (
                    <View
                      key={`${section.id}-pair-${pairIndex}`}
                      style={{
                        width: getListSlideWidth(screenWidth),
                        gap: 12,
                      }}
                    >
                      {pair.map((event: EventItem, eventIndex) => (
                        <HomeEventHorizontalCard
                          key={`${section.id}-${event.id}-${pairIndex}-${eventIndex}`}
                          event={event}
                          isFeatured={section.isFeatured}
                        />
                      ))}
                    </View>
                  ))}
                </ScrollView>
              ) : section.marquee && section.events.length > 4 ? (
                <HomeEventsMarquee
                  sectionId={section.id}
                  events={section.events}
                  cardWidth={cardWidth}
                  gap={HOME_SECTION_CARD_GAP}
                  isFeatured={section.isFeatured}
                />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: PAGE_GUTTER,
                    paddingTop: 4,
                    paddingBottom: 4,
                    gap: HOME_SECTION_CARD_GAP,
                  }}
                >
                  {section.events.map((event: EventItem, eventIndex) => (
                    <HomeEventCard
                      key={`${section.id}-${event.id}-${eventIndex}`}
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
