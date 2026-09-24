import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
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
  MOBILE_HOME_SECTION_HEADER_GAP,
  PAGE_GUTTER,
} from "../../constants/homeSection";
import {
  formatHomeSectionTitle,
  getHomeSectionChrome,
  homeSectionTitleStyle,
  homeSeeAllButtonStyle,
  homeSeeAllStyle,
} from "../../constants/homeTypography";
import { EventItem, fetchUpcomingEvents } from "../../lib/events";
import type {
  SectionLoadingProps,
  SectionReloadHandle,
} from "../../lib/sectionReload";
import { useIsTablet } from "../../lib/responsive";
import { useTranslation } from "../context/_LocaleContext";
import { prefetchEventImages } from "./_EventCardImage";
import { AppText as Text } from "@/components/ui/AppText";
import HomeEventCard, {
  getHomeEventCardWidth,
  HomeEventCardSkeleton,
} from "./HomeEventCard";

type Props = SectionLoadingProps & {
  onSeeAll?: () => void;
};

const EventsSection = forwardRef<SectionReloadHandle, Props>(
  function EventsSection({ onSeeAll, onLoadingChange }, ref) {
    const router = useRouter();
    const { t } = useTranslation();
    const isTablet = useIsTablet();
    const { width: screenWidth } = useWindowDimensions();
    const chrome = getHomeSectionChrome(screenWidth);
    const cardWidth = getHomeEventCardWidth(screenWidth, isTablet);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(
      async (options?: { silent?: boolean; refresh?: boolean }) => {
        const silent = options?.silent ?? false;
        if (!silent) setLoading(true);
        try {
          const res = await fetchUpcomingEvents(undefined, {
            refresh: options?.refresh,
          });
          setEvents(res.items);
          void prefetchEventImages(res.items);
        } catch {
          setEvents([]);
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
      onLoadingChange?.(loading);
    }, [loading, onLoadingChange]);

    const visibleEvents = useMemo(() => events.slice(0, 8), [events]);

    if (!loading && visibleEvents.length === 0) {
      return null;
    }

    return (
      <View style={{ paddingTop: 20 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: PAGE_GUTTER,
            marginBottom: MOBILE_HOME_SECTION_HEADER_GAP,
            minHeight: chrome.height,
            gap: 6,
          }}
        >
          <Text style={[homeSectionTitleStyle(isTablet), { flex: 1 }]} numberOfLines={1}>
            {formatHomeSectionTitle(t("defaultEventsSection"))}
          </Text>
          <TouchableOpacity
            onPress={onSeeAll ?? (() => router.push("/(tabs)/events"))}
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
        </View>

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
          {loading
            ? Array.from({ length: 3 }).map((_, idx) => (
                <HomeEventCardSkeleton
                  key={`events-skeleton-${idx}`}
                  width={cardWidth}
                />
              ))
            : visibleEvents.map((event) => (
                <HomeEventCard
                  key={event.id}
                  event={event}
                  width={cardWidth}
                />
              ))}
        </ScrollView>
      </View>
    );
  },
);

export default EventsSection;
